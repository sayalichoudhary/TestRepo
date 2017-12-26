/**
 * Inspects the incoming request for OAuth validation
 * Created by API Defender on 26/03/2016
 * @version 1.0
 */

// Dependencies
var log4js = require('log4js');
var path = require('path');
var request = require("request");
var url = require("url");
var http = require("http");

// Logger
var logger = log4js.getLogger('OAuthIDService');

//
// Constructor for service
//
function init() {
    logger.debug("Initializing OAuth ID Module");
}

//
// Function to validate incoming request for OAuth
//
function authenticateRequest(req, res, callback) {
    // Validation skipped for now
    // Adding user_id in request as auth object
    logger.debug("IN OAUTH");
    req.user_id = 1932;
    callback(true);
}

// Interface
module.exports = {
    init: init,
    authenticateRequest: authenticateRequest
}