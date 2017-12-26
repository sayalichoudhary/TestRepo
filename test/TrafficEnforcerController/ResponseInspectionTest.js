/**
 * Test case for response traffic inspector
 * Created by API Defender on 05/05/2016
 * @version 1.0
 */

var app1 = require('../initalize.js');
var assert = require('assert');

var rule1= {"ruleId" : "rule40", "slot" : {"slotId" : "RESPONSE_BODY", "name" : "", "pattern" : "Apache|MySql|Nginx|tomcat", "action" : "block", 'conditional' : null, 'time' : null, 'count' : "", 'duration' : ""}}
var rule2= {"ruleId" : "rule37", "slot" : {"slotId" : "RESPONSE_HEADER", "name" : "", "pattern" : "(^5\d{2}$)", "action" : "block", 'conditional' : null, 'time' : null, 'count' : "", 'duration' : ""}}
var rule3= {"ruleId" : "rule62", "slot" : {"slotId" : "SESSION_FIXATION", "name" : "", "pattern" : "(? :(j?sessionid|(php)?sessid|oc_sessionPassphrase|(asp|jserv|jw)?session[-_]?(id)?|cf(id|token)|sid).*?=([^\s].*?)\;\s?)", "action" : "block", 'conditional' : null, 'time' : null, 'count' : "5", 'duration' : "2"}};

var ruleSets = [];

global.InspectionSlot = {"ruleSets" : []}

global.InspectionSlot.ruleSets.push(JSON.stringify(rule1));
global.InspectionSlot.ruleSets.push(JSON.stringify(rule2));
global.InspectionSlot.ruleSets.push(JSON.stringify(rule3));
// global.InspectionSlot.ruleSets.push(JSON.stringify(rule4));

var TrafficEnforcerController = require('../../application/controllers/TrafficEnforcerController.js');



var response1 = {
	"body"  : "Apache|MySql|Nginx|tomcat",
	"statusCode" : 500,
	"_headers"  : {
	},
	"headers"  : {},
	"apiDomainConfObj"  : {
        "apiDomainId": "apidomin01",
        "enterpriseName": "APIdefender",
        "entId": "ent001",
        "app_name": "localhost",
        "appId": "app001",
        "request_domain": "localhost",
        "request_path": "/ocs/files_sharing/api/v1/shares",
        "target": "https://apidefender-test.com",
        "target_port": 443,
        "target_path": "",
        "ID": "BasicAuthID",
        "ssl_certificate_name": "server.crt",
        "ssl_key_name": "serevr.key"
    }
};

var response2 = {
	"body"  : "Traffic Inspection Traffic Inspection",
	"statusCode" : "200",
	"_headers"  : {},
	"headers"  : {},
    "apiDomainConfObj"  : {
        "apiDomainId": "apidomin02",
        "enterpriseName": "APIdefender2",
        "entId": "ent001",
        "app_name": "localapp",
        "appId": "app001",
        "request_domain": "localhost.com",
        "request_path": "/ocs/v1/files_sharing/api/v1/shares",
        "target": "https://example.com",
        "target_port": 80,
        "target_path": "",
        "ID": "BasicAuthID",
        "ssl_certificate_name": "",
        "ssl_key_name": ""
    }
};


describe('Traffic Inspection..',  function(){
	// this.timeout(4000);
	
	it('1. If response contains attack it will block the response and return false', function (done){
		var body = response1.body;
		
		 TrafficEnforcerController.inspectResponseTraffic(response1, body, function callback(result) {
		 	assert.equal(result, false);
		 	done();
		 });
	});

	it('2. If response does not contains any attack it will allow the response and return true', function (done){
		var body = response2.body;
		 TrafficEnforcerController.inspectResponseTraffic(response2, body, function callback(result) {
		 	assert.notEqual(result, false);
		 	done();
		 });
	});
});