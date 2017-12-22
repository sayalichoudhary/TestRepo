/**
 * Test case for OAuth validation
 * Created by API Defender on 10/04/2016
 * @version 1.0
 */


// var app1 = require('../initalize.js');
var assert = require('assert');

var OAuth = require('../../application/services/IDServices/OAuthIDService.js');

var req = {"user_id": 1932 };
var res = {};

describe('OAuth testing..', function (){
	it('Should return true if user is Authenticated...', function(done){
		OAuth.authenticateRequest(req, res, function (result){
			assert.equal(result, true);
			assert.equal(1932, req.user_id);
			done();
		});
	});

	it('Should return false if user is not Authenticated...', function(done){
		OAuth.authenticateRequest(req, res, function (result){
			assert.notEqual(result, false);
			assert.notEqual(1930, req.user_id);
			done();
		});
	});
});