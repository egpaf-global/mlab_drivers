#!/usr/bin/env node

"use strict";

const SerialPort = require("serialport").SerialPort;
const readLine = require("readline");

var port = new SerialPort({
  path: "/dev/ttyUSB0",
  autoOpen: true,
  baudRate: 9600,
  dataBits: 7,
  stopBits: 1,
  parity: "none",
  rtscts: false,
});
var path = require("path");
var config = require(path.resolve(".", "config.json"));
var kx21n = require(path.resolve(".", "kx21n.json"));
var client = require("node-rest-client").Client;
//var parser = new Readline();

var sampleResult =
  "D1U201704250000000000000043000000000570049200145004480091100295003240031800409000920049900023000050002900477001330013400111003370";

//var cmd = Buffer.from([0x01]);
//console.log(cmd.toString());
var line = "";

var options_auth = {
  user: config.username,
  password: config.password,
};

var reading = false;
var urls = [];

function sendData(urls) {
  var url = urls[0];
  urls.shift();

  new client(options_auth).get(url, function (data) {
    if (urls.length > 0) {
      sendData(urls);
    }
  });
}

port.open(function (err) {
  if (err) {
    return console.log("Error opening port: ", err.message);
  }

  port.write("main screen turn on");
});

port.on("open", function () {
  console.log("Port open");
});

var StringDecoder = require("string_decoder").StringDecoder;
var d = new StringDecoder("utf8");
var line = "";
port.on("data", function (data) {
  console.log(String(data));
  if (String(data).match(/^\x02/)) {
    console.log("Got STX");

    reading = true;

    line += String(data).replace(/^\x02/, "");
  } else if (
    String(data)
      .charAt(String(data).length - 1)
      .match(/^\x1A/)
  ) {
    console.log("Got ETX");

    reading = false;

    console.log(line);

    var result = line;

    var id = result.substr(11, 10);

    var specimenId = id;

    specimenId = specimenId.substr(0, 10);
    console.log("Sample ID: %s", specimenId);

    var base = 12;

    var tests = [
      "WBC",
      "LYM#",
      "MID#",
      "GRAN#",
      "LYM%",
      "MID%",
      "GRAN%",
      "RBC",
      "HGB",
      "MCHC",
      "MCV",
      "MCH",
      "RDW-CV",
      "HCT",
      "PLT",
      "MPV",
      "PDW",
      "PCT",
      "RDW-SD",
    ];

    var results = {};

    var signs = {
      0: "",
      1: "",
      2: "",
      4: "",
      3: "",
    };

    for (var i = 0; i < tests.length; i++) {
      var test = tests[i];
      if (i == 0) {
        results[test] =
          result.substr(22 + base, 3) + "." + result.substr(25 + base, 1);
      } else if (i == 1) {
        results[test] =
          result.substr(26 + base, 3) + "." + result.substr(29 + base, 1);
      } else if (i == 2) {
        results[test] =
          result.substr(30 + base, 3) + "." + result.substr(33 + base, 1);
      } else if (i == 3) {
        results[test] =
          result.substr(34 + base, 3) + "." + result.substr(37 + base, 1);
      } else if (i == 4) {
        results[test] =
          result.substr(38 + base, 2) + "." + result.substr(40 + base, 1);
      } else if (i == 5) {
        results[test] =
          result.substr(41 + base, 2) + "." + result.substr(43 + base, 1);
      } else if (i == 6) {
        results[test] =
          result.substr(44 + base, 2) + "." + result.substr(46 + base, 1);
      } else if (i == 7) {
        results[test] =
          result.substr(47 + base, 1) + "." + result.substr(48 + base, 2);
      } else if (i == 8) {
        results[test] =
          result.substr(50 + base, 2) + "." + result.substr(52 + base, 1);
      } else if (i == 9) {
        results[test] =
          result.substr(54 + base, 2) + "." + result.substr(56 + base, 1);
      } else if (i == 10) {
        results[test] =
          result.substr(58 + base, 2) + "." + result.substr(60 + base, 1);
      } else if (i == 11) {
        results[test] =
          result.substr(62 + base, 2) + "." + result.substr(64 + base, 1);
      } else if (i == 12) {
        results[test] =
          result.substr(65 + base, 2) + "." + result.substr(67 + base, 1);
      } else if (i == 13) {
        results[test] =
          result.substr(68 + base, 2) + "." + result.substr(70 + base, 1);
      } else if (i == 14) {
        results[test] = result.substr(71 + base, 4);
      } else if (i == 15) {
        results[test] =
          result.substr(75 + base, 2) + "." + result.substr(77 + base, 1);
      } else if (i == 16) {
        results[test] =
          result.substr(78 + base, 2) + "." + result.substr(80 + base, 1);
      } else if (i == 17) {
        results[test] = "0." + result.substr(81 + base, 3);
      } else if (i == 18) {
        results[test] =
          result.substr(85 + base, 2) + "." + result.substr(87 + base, 1);
      }

      if (specimenId.trim().length > 0 && kx21n[test] != undefined) {
        var measureId = kx21n[test];
        var measureValue = parseFloat(results[test]).toString();
        if (measureValue) {
          measureValue.replace(/undefined/, "");
        }

        var url =
          config.protocol +
          "://" +
          config.host +
          ":" +
          config.port +
          config.path +
          "?specimen_id=" +
          encodeURIComponent(specimenId) +
          "&measure_id=" +
          encodeURIComponent(measureId) +
          "&result=" +
          encodeURIComponent(measureValue) +
          "&machine_name=" +
          encodeURIComponent(config.machineName);

        urls.push(url);
      }

      console.log("%s: %s", test, measureValue);
    }

    sendData(urls);
    line = "";
  } else {
    // process.stdout.write(String(data).trim());

    line += String(data);
    //		console.log(line);
  }
});

console.log(line);
