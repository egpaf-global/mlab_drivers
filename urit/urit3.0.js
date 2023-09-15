"use strict"

var path = require("path");
var config = require(path.resolve('.','config', "config.json"));
var kx21n = require(path.resolve('.','config',  "kx21n.json"));
const SerialPort = require("serialport").SerialPort;
const { exec } = require("child_process");
var port = new SerialPort({path: "/dev/ttyUSB0", autoOpen: true, baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', rtscts: false });
var client = require('node-rest-client').Client;
var hl7 = require('simple-hl7');
const parser = new hl7.Parser();
var client = require('node-rest-client').Client;

var options_auth = {user: config.username,password: config.password};
var urls = [];
var oldspecimenId = "";
var specimenId = "";
var lineCounter = 1;
var myData = [];
var arrayData = [];
var lineCounter = 1;



		function sendData(urls){
			var url = urls[0];
			urls.shift();
			(new client(options_auth)).get(url, function (data) {
			if(urls.length > 0){
				sendData(urls);
			}
			});
		}
		
		function urlsProcessing(urls){
			if(urls.length > 0){   
                         console.log(`Taille des urls: ${urls.length}`);            
			console.log(urls);
			sendData(urls);
                        urls = [];
                        myData = [];
	  		arrayData = [];
			}else{
			console.log("No result sent to LIMS!!")
                        
			}	
		}






		function reset(){
			if (String(myData).split("PID")[1] != undefined && lineCounter >= 57){
		console.log("finished reading");
		lineCounter = 1; 
				port.close(); 	     
			}
		else if(String(myData).split("PID")[1] == undefined && lineCounter >= 57) {
			console.log(`Line counter de reset : ${lineCounter}`);
			lineCounter = 1;
			myData = [];
		}
		}



	  function dataProcessing(specimenID,results){

				
				try {
					  results.forEach(result => {
					

					var testName = result.split("|")[3];; // getting test name
					var obsResult = result.split("|")[5];; // getting result from the segment
					var testName = kx21n[testName]; // getting the correct naming as per LIMS
						console.log(testName);
						
			  
					  if(specimenID && testName)	{ 
							var url = config.protocol + "://" +
								config.host + ":" + config.sport + config.path + 
								  "?specimen_id=" + encodeURIComponent(specimenID) +
								  "&measure_id=" + encodeURIComponent(testName) + 
								  "&result=" + encodeURIComponent(obsResult);  
								  "&machine_name=" + encodeURIComponent(config.machineName);

								  urls.push(url);
                                                                  
						}
				  }) 	
				} catch (error) {
				  console.log(error.message);
				  dataProcessing(specimenID,results);
				}
			  
			  }
			  



		function requestsProcessing(data) {		
			try {
                          
                 	lineCounter +=1;
			if (lineCounter < 28){	
			 if (String(data).trim().length > 0){
			    myData += String(data).trim();
				}

			}

			if (myData!='' && String(myData).split("PID")[1] != undefined && lineCounter == 27){ 

			console.log('******message received*****');
			myData = parser.parse(myData);

	         	specimenId = String(myData).split("PID")[1].split("OBR")[0].split("|")[2];
                        arrayData = String(myData).split("PID")[1].split("OBR")[1].split("OBX");

			dataProcessing(specimenId,arrayData);
			urlsProcessing(urls);   

	               }
                       
                       reset();


			} catch (error) {
			console.log(error.message);
            requestsProcessing(data);
			}
           

		};




		port.on('data', function (data) {

                requestsProcessing(data);
		
           
		})


  


