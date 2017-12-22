/**
 * Test case for Relay service
 * Created by API Defender on 02/05/2016
 * @version 1.0
 */


var initalize = require('../initalize.js');
var assert = require('assert');

var RelayService = require('../../application/services/RelayService.js');


var req1 = {
    "httpVersion": '1.1',
    "apiDomainConfObj" : {
        "apiDomainId": "apidomin01"
    },
    "url":"/ocs/files_sharing/api/v1/shares",
    "method":"GET",
    "headers" : {
        "host":"apidefender-test.com",
        "x-forwarded-for":"1.2.3.0",
        "authorization" : "Basic {{token}}"
    },
    "body" :{},
    "cookies":{},
    "socket":{}
};
var req2 = {
    "httpVersion": '1.1',
    "apiDomainConfObj" : {
        "apiDomainId": "apidomin02"
    },
    "url":"/ocs/v1/files_sharing/api/v1/shares",
    "method":"GET",
    "headers" : {
        "host":"apidefender-test.com",
        "x-forwarded-for":"1.2.3.0",
        "authorization" : ""
    },
    "body" :{},
    "cookies":{},
    "socket":{}
};

var res = {};

describe('Forward request.... ', function (){
    this.timeout(3000);
    it('Relay or Forward the request to actual domain and return 200..', function(done){
        RelayService.forwardRequest(req1, res, function (response, resBody){
            assert.equal(response.statusCode, 200);
            done();
        });
    });

    it('Forward the request to actual domain without Auth and return 401..', function(done){
        RelayService.forwardRequest(req2, res, function (response, resBody){
            assert.notEqual(response.statusCode, 200);
            done();
        });
    });
});
