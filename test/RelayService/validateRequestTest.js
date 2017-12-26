/**
 * Test case for relay service
 * Created by API Defender on 15/04/2016
 * @version 1.0
 */


var initialze = require('../initalize.js');
var assert = require('assert');
var url = require('url');
var path = require('path');

var RelayService = require('../../application/services/RelayService.js');

// Authorized user with Basic auth 
var req1 = {
	"apiDomainConfObj" :{},
	"url":"/ocs/files_sharing/api/v1/shares?password=APID@12345",
	"method":"GET",
	"headers" : {
		"host":"prod-ti.mobileo2.com",
		"x-forwarded-for":"1.20.3.0",
		"authorization" : "Basic dGVzdDp0ZXN0MTIzNA=="
	},
	"body" :{}
};
//Unauthorized user with Basic auth
var req2 = {
	"apiDomainConfObj" : {},
	"url":"/ocs/v1/files_sharing/api/v1/shares",
	"method":"GET",
	"headers" : {
		"host":"localhost",
		"x-forwarded-for":"2.199.255.255",
		"authorization" : "Basic"
	},
	"body" :{}
};
// Anonymous API
var req3 = {
	"apiDomainConfObj" : {},
	"url":"/demo",
	"method":"GET",
	"headers" : {
		"host":"localhost",
		"x-forwarded-for":"2.199.255.255"
	},
	"body" :{}
};
// User with OAuth 
var req4 = {
    "apiDomainConfObj" : {},
	"url":"/yw/v1/weather?password=password@123",
	"method":"GET",
	"headers" : {
		"host":"apigee-ti.mobileo2.com",
		"x-forwarded-for":"2.199.255.255"
	},
	"body" :{}
};
// User without Authorization
var req5 = {
    "apiDomainConfObj" :{},
	"url":"/ocs/v1/files_sharing/api/v1/shares",
	"method":"GET",
	"headers" : {
		"host":"localhost",
		"x-forwarded-for":"1.20.3.0"
	},
	"body" :{}
};
var res = {};

describe('Validating Request...',  function(){
	this.timeout(9000);
	it('Authorized user with Basic auth..', function (done){
		RelayService.validateRequest(req1, res, function callback(result) {
			// console.log(result);
			assert.equal(result, true);
			done();
		});
	});

	it('Unauthorized user with Basic auth..', function (done){
		RelayService.validateRequest(req2, res, function callback(result) {
			// console.log(result);
			assert.notEqual(result, true);
			done();
		});
	});

	it('Anonymous API.. ', function (done){
		RelayService.validateRequest(req3, res, function callback(result) {
			// console.log(result);
			assert.equal(result, true);
			done();
		});
	});

	it('User with OAuth authorization..', function (done){
		RelayService.validateRequest(req4, res, function callback(result) {
			// console.log(result);
			assert.equal(result, true);
			done();
		});
	});

	it('User without Auth..', function (done){
		RelayService.validateRequest(req5, res, function callback(result) {
			// console.log(result);
			assert.notEqual(result, true);
			done();
		});
	});
});


