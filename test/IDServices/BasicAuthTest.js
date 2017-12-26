/**
 * Test case for Basic Authentication
 * Created by API Defender on 19/04/2016
 * @version 1.0
 */

var initalize = require('../initalize.js');
var assert = require('assert');

var BasicAuth = require('../../application/services/IDServices/BasicAuthIDService.js');

var req1 = {
			"headers":
					{
						"authorization" : "Basic {{token}}"
					},
			"appId":"app001",
			"apiDomainConfObj":{
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
            },
			"entId" :""
		};

var req2 = {
			"headers":
					{
						"authorization" : "Basic {{token}}"
					},
			"apiDomainConfObj":{
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

var res={};

describe('BasicAuth testing...', function (){
	this.timeout(4000);
	it('Should return true if user is Authenticated...', function(done){
		BasicAuth.authenticateRequest(req1, res, function (result){
			assert.equal(result, true);
			done();
		});
	});

	it('Should return false if user is not Authenticated...', function(done){
		BasicAuth.authenticateRequest(req2, res, function (result){
			assert.notEqual(result, true);
			done();
		});
	});
});   	