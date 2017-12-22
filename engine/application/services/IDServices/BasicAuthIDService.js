/**
 * Inspects the incoming request for BasicAuth validation
 * Created by API Defender on 20/03/2016
 * @version 1.0
 */

// Dependencies
var log4js = require('log4js');
var path = require('path');
var request = require("request");
var url = require("url");
var http = require("http");

// Logger
var logger = log4js.getLogger('BasicAuthIDService');


// Services
var RelayService;
var RedisCache = global.app.redisCache;

//
// Constructor for service
//
function init() {
    logger.debug("Initializing BasicAuth ID Module");
}

//
// Function to authenticate incoming request by checking Authorization header against cache values
//
function authenticateRequest(req, res, callback) {
    var authResult = true;

    // Get Authenticate Header from request
    var authHeader = req.headers['authorization'];

    if (authHeader != undefined) {
        logger.debug("Auth Header: ", authHeader);
        var key = authHeader + "." + req.apiDomainConfObj.appId;
        //RedisCache.getAllKeys(authHeader+"."+req.appId, function (list) {
        RedisCache.checkExists(key, function (isExist) {
            if (!isExist) {
                authResult = false;
                callback(authResult);
            } else {
                // Get Relay Object from RelayObjectMap for the host
                var apiDomainObj = app.apiDomainUtil.getAPIDomainObjectByAPIDomainId(req.apiDomainConfObj.apiDomainId);
                req.user_name = 'test';
                req.apiDomainId = apiDomainObj;
                callback(authResult);
            }
        });
        //});
    } else {
        authResult = false;
        callback(authResult);
    }
    //return authResult;
}

// Interface
module.exports = {
    init: init,
    authenticateRequest: authenticateRequest
};
