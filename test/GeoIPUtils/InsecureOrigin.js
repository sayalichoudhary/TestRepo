/**
 * Test case for insecure origin detection
 * Created by API Defender on 10/04/2016
 * @version 1.0
 */


var initalize = require('../initalize');
var assert  = require('assert');

var req1 = {
	"headers" : {
		"x-forwarded-for" : "{{client IP Address}}"
	}
};

var GeoIPUtils = require('../../application/utils/GeoIPUtils.js');

describe('Find the Country code on the bases of IP...', function (){
	this.timeout(15000)
	it('If found return country code...', function (done){
		GeoIPUtils.insecureOrigin(req1, function (countryCode){
			assert.notEqual(countryCode, "--");	
			done();
		});
	});
});