"use strict";

var path = require("path");
var config = require(path.resolve('.', 'config', 'config.json'));
var kx21n = require(path.resolve('.', 'config', 'kx21n.json'));
var net = require('net');
var client = require('node-rest-client').Client;
var hl7 = require('simple-hl7');
const parser = new hl7.Parser();

var options_auth = { user: config.username, password: config.password };
var urls = [];
var lineCounter = 1;
var myData = [];

var server = net.createServer(function (socket) {
	console.log('Client connected.');

	socket.on('data', function (data) {
		var requestData = data.toString();
		// console.log('Received data:\n' + requestData);

		// Process incoming HL7 message
		processHL7Message(requestData, function (feedback) {
			console.log('Sending response:\n' + feedback);
			socket.write(feedback);
		});
	});

	socket.on('end', function () {
		console.log('Client disconnected.');
	});
});

server.listen(config.networkPort, function () {
	console.log(`Server listening on port ${config.networkPort}`);
});

function sendData(urls) {
	var url = urls[0];
	urls.shift();
	(new client(options_auth)).post(url, function (data, response) {
		console.log("API Response:", response.statusCode, response.statusMessage);
		if (urls.length > 0) {
			sendData(urls);
		}
	});
}

function urlsProcessing(urls) {
	if (urls.length > 0) {
		console.log(`Taille des urls: ${urls.length}`);
		console.log(urls);
		sendData(urls);
		urls = [];
		myData = [];
		arrayData = [];
	} else {
		console.log("No result sent to LIMS!!");
	}
}

function reset() {
	if (String(myData).split("PID")[1] != undefined && lineCounter >= 57) {
		console.log("finished reading");
		lineCounter = 1;
	} else if (String(myData).split("PID")[1] == undefined && lineCounter >= 57) {
		console.log(`Line counter de reset : ${lineCounter}`);
		lineCounter = 1;
		myData = [];
	}
}

function dataProcessing(specimenID, results) {

	try {
		results.forEach(result => {
			var testName = result.split("|")[3]; // getting test name
			var obsResult = result.split("|")[5]; // getting result from the segment
			var testName = kx21n[testName]; // getting the correct naming as per LIMS

			if (specimenID && testName) {
				var url = `${config.protocol}://${config.host}:${config.sport}${config.path}` +
					`?accession_number=${encodeURIComponent(specimenID)}` +
					`&measure_id=${encodeURIComponent(testName)}` +
					`&result=${encodeURIComponent(obsResult)}` +
					`&machine_name=${encodeURIComponent(config.machineName)}`;
				console.log(url);
				urls.push(url);
				console.log('I have reached here')
			}
		});
	} catch (error) {
		console.log(error.message);
		dataProcessing(specimenID, results);
	}
}

function requestsProcessing(data, callback) {
	try {
		lineCounter += 1;
		if (lineCounter < 28) {
			if (data.trim().length > 0) {
				myData += data.trim();
			}
		}

		if (myData !== '' && String(myData).split("PID")[1] !== undefined && lineCounter === 27) {
			console.log('******message received*****');
			myData = parser.parse(myData);

			specimenId = String(myData).split("PID")[1].split("OBR")[0].split("|")[2];
			arrayData = String(myData).split("PID")[1].split("OBR")[1].split("OBX");

			dataProcessing(specimenId, arrayData);
			urlsProcessing(urls);
		}

		reset();
	} catch (error) {
		console.log(error.message);
	}

	// Create a response to send back to the client
	var responseData = 'Request processed successfully\n'; // Modify this as needed
	callback(responseData);
}

function processHL7Message(data, callback) {
	try {
		lineCounter += 1;
		if (lineCounter < 28) {
			if (data.trim().length > 0) {
				myData += data.trim();
			}
		}
		if (myData !== '' && String(myData).split("PID")[1] !== undefined && lineCounter !== 27) {
			console.log('******message received*****');
			myData = parser.parse(myData);

			// Extract relevant information from the HL7 message here
			// Example: specimenId, arrayData, etc.
			// You can use the hl7 library to parse the message further

			// Once you have extracted the information, you can process it
			// and create a response message
			let specimenId = String(myData).split("PID")[1].split("OBR")[1].split("|")[3];
			let arrayData = String(myData).split("PID")[1].split("OBR")[1].split("OBX");
			
			dataProcessing(specimenId, arrayData);
			urlsProcessing(urls);

			// var feedbackMessage = createFeedbackMessage(); // Implement this function

			// callback(feedbackMessage);
		}

		reset();
	} catch (error) {
		console.log(error.message);
	}
}
