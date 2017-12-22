/**
 * Test case for request traffic inspector
 * Created by API Defender on 27/04/2016
 * @version 1.0
 */


var app1 = require('../initalize.js');
var assert = require('assert');


// Rules
var rule1= {"ruleId": "rule60", "slot": {"slotId": "INSECURE_ORIGIN", "name": "", "pattern": "CN|TH|MY|CA", "action": "block", 'conditional': null, 'time': null, 'count': "", 'duration': ""}}
var rule2= {"ruleId": "rule61", "slot": {"slotId": "BRUTE_FORCE", "name": "", "pattern": "BRUTE_FORCE", "action": "block", 'conditional': null, 'time': null, 'count': "5", 'duration': "2"}}
var rule3= {"ruleId": "rule16", "slot": {"slotId": "URL", "name": "", "pattern": "(?:(?:[\;\|\`]\W*?\bcc|\b(wget|curl))\b|\/cc(?:[\&apos;\&quot;\|\;\`\-\s]|$))", "action": "block", 'conditional': null, 'time': null, 'count': "", 'duration': ""}}

var TrafficEnforcerController = require('../../application/controllers/TrafficEnforcerController.js');
var ruleSets = [];

global.InspectionSlot = {"ruleSets":[]}

global.InspectionSlot.ruleSets.push(JSON.stringify(rule1));
// global.InspectionSlot.ruleSets.push(JSON.stringify(rule2));
global.InspectionSlot.ruleSets.push(JSON.stringify(rule3));


var req1 = {
	"apiDomainConfObj" : {
        "apiDomainId": "relay006",
        "enterpriseName": "mobileO2",
        "entId": "ent001",
        "app_name": "localhost",
        "appId": "app001",
        "request_domain": "localhost",
        "request_path": "/ocs/files_sharing/api/v1/shares",
        "target": "https://apidefender-test.com",
        "target_port": 443,
        "target_path": "",
        "ID": "BasicAuthID"
    },
	"url":"/ocs/files_sharing/api/v1/shares?password=;wget",
	"method":"GET",
	"headers" : {
		"host":"localhost",
		"x-forwarded-for":"1.20.3.0"
	},
	"body" :{},
	"query":{ "password": '' }
};

var req2 = {
	"apiDomainConfObj" : {
        "apiDomainId": "relay006",
        "enterpriseName": "mobileO2",
        "entId": "ent001",
        "app_name": "localhost",
        "appId": "app001",
        "request_domain": "localhost",
        "request_path": "/ocs/v1/files_sharing/api/v1/shares",
        "target": "https://example.com",
        "target_port": 443,
        "target_path": "",
        "ID": "BasicAuthID"
    },
	"url":"/ocs/v1/files_sharing/api/v1/shares?password=",
	"method":"GET",
	"headers" : {
		"host":"localhost",
		"x-forwarded-for":"2.199.255.255"
	},
	"body" :{},
	"query":{ "password": '' }
};

describe('Traffic Inspection..',  function(){
	this.timeout(20000);
	it('If request contains attack it will block the request and return false', function (done){
		 TrafficEnforcerController.enforceTraffic(req1, function callback(result) {
		 	assert.equal(result, false);
		 	done();
		});
	});

	it('If request does not contains any attack it will allow the request and return true', function (done){
		 TrafficEnforcerController.enforceTraffic(req2, function callback(result) {
		 	assert.notEqual(result, false);
		 	done();
		});
	});
});
