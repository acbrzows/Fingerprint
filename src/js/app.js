// Your code goes here
var d3 = require("d3");

var previousSpeed = 0; //0=parked, 1-2=driving
gm.system.watchSpeed(watchSpeedCallback);
var dataListener; // id of vehicle data process
var rotaryWatcher; //id of rotary watcher process

var brakePositionData = [];
var acceleratorPositionData = [];
var wheelAngleData = [];

var seconds;
var namesArray = [];

var lastBrake;
var lastAccelerator;
var lastWheelAngle;

var pickDriverPage = document.getElementById("start-up-page");
var guessDriverPage = document.getElementById("guess-driver");
var newDriverPage = document.getElementById("new-driver");
var statsPage = document.getElementById("stats-page");
var readyToDrivePage = document.getElementById("start-drive");



pickDriverPage.style.display = 'none';
guessDriverPage.style.display = 'none';
newDriverPage.style.display = 'none';
//readyToDrivePage.style.display = 'none';
statsPage.style.display = 'none';
hideBoth();

function resetToStart() {
  pickDriverPage.style.display = 'none';
  guessDriverPage.style.display = 'none';
  newDriverPage.style.display = 'none';
  readyToDrivePage.style.display = 'block';
  statsPage.style.display = 'none';
}

function watchSpeedCallback(speed) {
  if (speed == 0 && previousSpeed > 0) {
    //stop the drive
    previousSpeed = speed;
    stopDrive();
  } else if (previousSpeed == 0 && speed > 0) {
    //start the drive
    previousSpeed = speed;
    startDrive();
  }
}

function startDrive() {
  //update the UI to show we're in driving mode
  //start watching for data
  // TODO: consider backing up existing data
  brakePositionData = [];
  acceleratorPositionData = [];
  wheelAngleData = [];
  console.log('starting drive');
  // document.getElementById("title").innerHTML = "Currently Driving";
  // document.getElementById("subtitle").innerHTML = "There should be stats here but someone didn't get them done in time for demos";
  dataListener = gm.info.watchVehicleData(processData,processDataError,['brake_position','accelerator_position','wheel_angle'],100);
  rotaryWatcher = gm.info.watchRotaryControl(handleRotary);


  readyToDrivePage.style.display = 'none';
  pickDriverPage.style.display = 'none';
  guessDriverPage.style.display = 'none';
  newDriverPage.style.display = 'none';
  statsPage.style.display = 'block';
}

function processData(data) {
  console.log('got vehicle data: ', data);
  if (data.brake_position) {
    lastBrake = data.brake_position;
    brakePositionData.push(lastBrake);
  } else if (lastBrake) {
    brakePositionData.push(lastBrake);
  } else {
    brakePositionData.push(0);
  }
  if (data.accelerator_position) {
    lastAccelerator = data.accelerator_position;
    acceleratorPositionData.push(lastAccelerator);
  } else if (lastAccelerator) {
    acceleratorPositionData.push(lastAccelerator);
  } else {
    acceleratorPositionData.push(0);
  }
  if (data.wheel_angle) {
    lastWheelAngle = data.wheel_angle;
    wheelAngleData.push(lastWheelAngle);
  } else if (lastWheelAngle) {
    wheelAngleData.push(lastWheelAngle);
  } else {
    wheelAngleData.push(0);
  }
}

function processDataError() {
  //TODO: display an error
}

function stopDrive() {
  //stop watching for data
  //send driving data to server, await response
  console.log('stopping drive');
  console.log('brake array: ', brakePositionData);
  console.log('acceleration array', acceleratorPositionData);
  console.log('wheel angle array', wheelAngleData);
  hideBoth();
  document.getElementById("guess-h1").innerHTML = "Drive Finished";
  document.getElementById("guess-h2").innerHTML = "Just one second while we crunch some numbers";
  readyToDrivePage.style.display = 'none';
  pickDriverPage.style.display = 'none';
  guessDriverPage.style.display = 'block';
  newDriverPage.style.display = 'none';
  statsPage.style.display = 'none';
  document.getElementById("guess-no").style.display = 'none';
  document.getElementById("guess-yes").style.display = 'none';

  gm.info.clearVehicleData(dataListener);
  gm.info.clearRotaryControl(rotaryWatcher);

  var wcc = new WolframCloudCall();
  console.log("sending data to wolfram");
  seconds = new Date() / 1000; //seconds since epoch
  wcc.call(acceleratorPositionData, brakePositionData, wheelAngleData, seconds, function(result) {
    console.log("data sent");
    console.log(result);
    wcc.callClassify(seconds,function(result) {
      console.log(result);
      if (result == null || result == "Null") {
        //handle unsure case
        readyToDrivePage.style.display = 'none';
        pickDriverPage.style.display = 'block';
        guessDriverPage.style.display = 'none';
        newDriverPage.style.display = 'none';
        statsPage.style.display = 'none';
        wcc.callListDrivers(function(result) {
          namesArray = result.split(",");

          console.log(result);
          $('#driver-select-button-list').empty();
          for (i in namesArray) {
            namesArray[i] = namesArray[i].replace(/[^A-Za-z0-9]/g, '');
            addDriverButton(namesArray[i]);
          }
        });
      } else {
        // handle sure case
        document.getElementById("guess-h1").innerHTML = "Driver Recognized as:";
        document.getElementById("guess-h2").innerHTML = result;
        document.getElementById("guess-no").style.display = 'block';
        document.getElementById("guess-yes").style.display = 'block';
        readyToDrivePage.style.display = 'none';
        pickDriverPage.style.display = 'none';
        guessDriverPage.style.display = 'block';
        newDriverPage.style.display = 'none';
        statsPage.style.display = 'none';
      }
    });
  });
}

function addDriverButton(userName) {
  var driverButton = $('<button/>', {'class': 'btn', 'type': 'button', 'id': userName}).append(
      $('<span/>', {text: userName})
  );
  $("#driver-select-button-list").append(
      $('<div/>', {'class': 'col-sm-4'}).append(
        driverButton
      )
  );
  $("#driver-select-button-list").on("click", "#"+userName, function(){
    console.log("training function with:");
    console.log(userName);
    var wcc = new WolframCloudCall();
    wcc.callTrainClassify(seconds,userName,function(result) {
      resetToStart();
    });
  });
}

$( "#driver-select-manual" ).mousedown(showInputNewDriverScreen);
function showInputNewDriverScreen() {
  //TODO: show the screen for manually inputting a driver name
  // TODO: use the driver name that was input to train the data, so it improves in the future
  readyToDrivePage.style.display = 'none';
  pickDriverPage.style.display = 'none';
  guessDriverPage.style.display = 'none';
  newDriverPage.style.display = 'block';
  statsPage.style.display = 'none';
}

$("#driver-manual-done").mousedown(classifyCustom);
function classifyCustom(){
  console.log("training function with:");
  console.log(userName);
  var userName = document.getElementById("driver-name-asdf").value;
  var wcc = new WolframCloudCall();
  wcc.callTrainClassify(seconds,userName,function(result) {
    resetToStart();
  });
}

/*
JavaScript EmbedCode usage:

var wcc = new WolframCloudCall();
wcc.call(accInt, brakeInt, steeringAngle, ID, function(result) { console.log(result); });
*/

var WolframCloudCall;

(function() {
WolframCloudCall = function() {	this.init(); };

var p = WolframCloudCall.prototype;

p.init = function() {};

p._createCORSRequest = function(method, url) {
	var xhr = new XMLHttpRequest();
	if ("withCredentials" in xhr) {
		xhr.open(method, url, true);
	} else if (typeof XDomainRequest != "undefined") {
		xhr = new XDomainRequest();
		xhr.open(method, url);
	} else {
		xhr = null;
	}
	return xhr;
};

p._encodeArgs = function(args) {
	var argName;
	var params = "";
	for (argName in args) {
		params += (params == "" ? "" : "&");
		params += encodeURIComponent(argName) + "=" + encodeURIComponent(args[argName]);
	}
	return params;
};

p._auxCall = function(url, args, callback) {
	var params = this._encodeArgs(args);
	var xhr = this._createCORSRequest("post", url);
	if (xhr) {
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.setRequestHeader("EmbedCode-User-Agent", "EmbedCode-JavaScript/1.0");
		xhr.onload = function() {
			if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
				callback(xhr.responseText);
			} else {
				callback(null);
			}
		};
		xhr.send(params);
	} else {
		throw new Error("Could not create request object.");
	}
};

p.call = function(accInt, brakeInt, steeringAngle, identifier, callback) {
	var url = "http://www.wolframcloud.com/objects/77de27df-c176-4003-9669-65f47541afe9";
	var args = {accInt: accInt, brakeInt: brakeInt, steeringAngle: steeringAngle, identifier: identifier};
	var callbackWrapper = function(result) {
		if (result === null) callback(null);
		else callback(result);
	};
	this._auxCall(url, args, callbackWrapper);
};

p.callClassify = function(key, callback) {
  var url = "http://www.wolframcloud.com/objects/b36b7ce5-4367-4e18-9c31-7db14765c39c";
  var args = {key: key};
  var callbackWrapper = function(result) {
    if (result === null) callback(null);
    else callback(result);
  };
  this._auxCall(url, args, callbackWrapper);
};

p.callTrainClassify = function(key, name, callback) {
  var url = "https://www.wolframcloud.com/objects/1d56be65-4a5c-4fdc-b78d-965a9a67a612";
  var args = {key: key, name: name};
  var callbackWrapper = function(result) {
    if (result === null) callback(null);
    else callback(result);
  };
  this._auxCall(url, args, callbackWrapper);
};

p.callListDrivers = function(callback) {
  var url = "http://www.wolframcloud.com/objects/cce7421b-d215-4232-aadb-0ed3ac20c440";
  var args = {};
  var callbackWrapper = function(result) {
    if (result === null) callback(null);
    else callback(result);
  };
  this._auxCall(url, args, callbackWrapper);
};

//https://www.wolframcloud.com/objects/cce7421b-d215-4232-aadb-0ed3ac20c440
//List Drivers

})();

// Dashboard JS

var currentlySelected = "top";

function resetDash() {
	$(".icon").removeClass("topGrad rightGrad bottomGrad leftGrad");
	$(".lines").hide();
  currentlySelected = null;
}

function selectTopStat() {
	$(".info .inner").css({"left":"0"});
	resetDash();
	$(".top").addClass("topGrad");
	$( ".lineTop" ).show();
  currentlySelected = "top";
  hideBoth();
};
$( ".top" ).mousedown(selectTopStat);

function selectRightStat() {
	$(".info .inner").css({"left":"-110px"});
	resetDash()
	$(".right").addClass("rightGrad");
	$( ".lineRight" ).show();
  currentlySelected = "right";
  show_gSpeed();
};
$( ".right" ).mousedown(selectRightStat);

function selectBottomStat() {
	$(".info .inner").css({"left":"-220px"});
	resetDash()
	$(".bottom").addClass("bottomGrad");
	$( ".lineBottom" ).show();
  currentlySelected = "bottom";
  hideBoth();
};
$( ".bottom" ).mousedown(selectBottomStat);

function selectLeftStat() {
	$(".info .inner").css({"left":"-330px"});
	resetDash()
	$(".left").addClass("leftGrad");
	$( ".lineLeft" ).show();
  currentlySelected = "left";
  show_gRPM();
};
$( ".left" ).mousedown(selectLeftStat);

function handleRotary(eventlist) {
  var event = eventlist[0];
  if (event === 'RC_CW') {
    switch (currentlySelected) {
      case "top":
        selectRightStat();
        break;
      case "right":
        selectBottomStat();
        break;
      case "bottom":
        selectLeftStat();
        break;
      default:
        selectTopStat();
    }
  } else if (event === 'RC_CCW') {
    switch (currentlySelected) {
      case "top":
        selectLeftStat();
        break;
      case "right":
        selectTopStat();
        break;
      case "bottom":
        selectRightStat();
        break;
      default:
        selectBottomStat();
    }
  }
}

// graphs

var svg = d3.select(svg),
    margin = {top: 0, right: 0, bottom: 1, left: 1},
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom,
    gSpeed = svg.append("gSpeed").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
    gRPM = svg.append("gRPM").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var x = d3.scaleLinear()
    .domain([0, size - 1])
    .range([0, width]);

var ySpeed = d3.scaleLinear()
    .domain([0, 200])
    .range([height, 0]);

var yRPM = d3.scaleLinear()
    .domain([0, 100])
    .range([height, 0]);

var lineSpeed = d3.line()
    .x(function(d,i) { return x(i); })
    .y(function(d,i) { return ySpeed(d); });

var lineRPM = d3.line()
    .x(function(d,i) { return x(i); })
    .y(function(d,i) { return yRPM(d); });

gRPM.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);
    gRPM.append("gRPM")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + yRPM(0) + ")")                      .call(d3.axisBottom(x));
    gRPM.append("gRPM")
        .attr("class", "axis axis--yRPM")
        .call(d3.axisLeft(yRPM));
    gRPM.append("gRPM")
        .attr("clip-path", "url(#clip)")
        .append("path")
        .datum(acceleratorPositionData)
        .attr("class", "lineSpeed")
        .transition()
        .duration(500)
        .ease(d3.easeLinear)
        .on("start", processData);

        function show_gSpeed() {
            d3.selectAll("gSpeed").attr("visibility", "visible");
            d3.selectAll("gRPM").attr("visibility", "hidden");
        }

        function show_gRPM() {
            d3.selectAll("gSpeed").attr("visibility", "hidden");
            d3.selectAll("gRPM").attr("visibility", "visible");
        }

        function hideBoth() {
            d3.selectAll("gSpeed").attr("visibility", "hidden");
            d3.selectAll("gRPM").attr("visibility", "hidden");
        }
