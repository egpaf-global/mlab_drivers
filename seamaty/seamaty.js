"use strict"

var path = require("path");
var config = require(path.resolve('.','config', "config.json"));
var mapping = require(path.resolve('.','config', "mapping.json"));
const PORT = config['port'];
var client = require('node-rest-client').Client;
var hl7 = require('simple-hl7');
var client = require('node-rest-client').Client;
var machine= hl7.tcp();
var options_auth = {user: config.username,password: config.password};
var urls = [];
var sampleID = "";
var results = "";





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
    console.log(urls);
    sendData(urls);
    urls = [];
  }else{
    console.log("No result sent to LIMS!!")
  }	
}

function dataProcessing(sampleID,results){
  try {
	    results.forEach(result => {
      var obsTestName = result.fields[3].value[0][0].value[0]; // getting test name
      var obsResult = result.fields[4].value[0][0].value[0]; // getting result from the segment
      var testName = mapping[obsTestName]; // getting the correct naming as per LIMS
          console.log(testName);
	        console.log(obsTestName);

	    if(sampleID && testName)	{ 
              var link = config.protocol + "://" +
                  config.host + ":" + config.sport + config.path + 
                    "?specimen_id=" + encodeURIComponent(sampleID) +
                    "&measure_id=" + encodeURIComponent(testName) + 
                    "&result=" + encodeURIComponent(obsResult);  
                  urls.push(link);
          }
    }) 	
  } catch (error) {
    console.log(error.message);
    dataProcessing(sampleID,results);
  }

}



function requestsProcessing(req, res, next) {
    try {
    console.log('******message received*****');
    var data = req.msg.log();
      console.log(data);
      sampleID = req.msg.getSegment('PID').fields[1].value[0]; // getting sample ID on OBR segment on position 1
      results = req.msg.getSegment('OBX'); // this is the results segment, where results will be retrieved
      
      dataProcessing(sampleID,results);
      urlsProcessing(urls);
      
    } catch (error) {      
      console.log(error.message);  
      requestsProcessing(req, res, next);
    }
    next();
};

machine.use(requestsProcessing);

machine.use(function(req,res,next){
  res.send();
})

machine.start(PORT);



