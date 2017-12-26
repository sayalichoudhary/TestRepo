/**
 * Loads the API Domain for incoming request, finds which ID module to use and forwards the request to it
 * Created by API Defender on 06/03/2016
 * @version 1.0
 */

// Dependencies
var http = require("http");
var log4js = require("log4js");
var path = require("path");
var config = require("config");
var request = require("request");
var fs = require("fs");
var url = require("url");

// Logger
var logger = log4js.getLogger("DirectorService");
var RedisCache;
//
// Cache of Application relay config ref
//
var APIDomainConfig;
var apiDomainObj = {};

//
// Constructor for service
// Inspect Application-Relay config and load relay config in memory
//
function init() {
    logger.debug("Validating APIDomain and loading APIDomain objects in memory");
    RedisCache = global.app.redisCache;
    var apiDomainConfigPath = path.join(global.appRoot, "/application/config/Application-Relay.json");

    var contents = fs.readFileSync(apiDomainConfigPath, "utf8");
    APIDomainConfig = JSON.parse(contents);

    var apiDomainConf = APIDomainConfig.apiDomainConf;
    for (var conf in apiDomainConf) {

        var rDomain = apiDomainConf[conf].request_domain;
        apiDomainObj[rDomain] = apiDomainConf[conf];

    }
}

//
// Function to inspect request and forward it to appropriate ID module defined in Application-Relay file
//
function validateRequest(req, res, callback) {
    // Extract host and URL from incoming request
    var reqHost = req.headers.host;
    var URLPath = url.parse(req.url, true).path;
    // Get Relay Object from RelayObjectMap for the host

    var apiDomainObj = app.apiDomainUtil.getAPIDomainByHostAndURL(reqHost, URLPath);
    if (null == apiDomainObj || apiDomainObj.apiDomainId == "default") {
        callback(false);
        return;
    }

    req.apiDomainConfObj = apiDomainObj;
    logger.trace("Relay Id of req : ", req.apiDomainConfObj.apiDomainId);
    var reqHost = req.apiDomainConfObj.target;
    var reqPort = req.apiDomainConfObj.target_port;
    var reqPath = req.apiDomainConfObj.target_path ? req.apiDomainConfObj.target_path : req.url;

    // Create target server endpoint host URL
    var serverUrl = "";
    var targetDomain = ((reqHost.indexOf("://") > -1) ? reqHost : (req.headers["x-forwarded-proto"] == "https") ? "https://" + reqHost + "" : "http://" + reqHost);
    var targetPort = (reqPort && req.headers["x-forwarded-proto"] == "https" ? ":" + reqPort : "");
    serverUrl = targetDomain + targetPort + reqPath;
    var SID = [];
    SID = serverUrl.match(/[a-zA-Z0-9]{20,}/g);
    req.API = serverUrl;
    if (SID != null) {
        req.APIKey = SID[0];
    }

    // Find the proper ID module for the request on the basis of data available in app relay object
    // and forward the request
    var idModuleName = req.apiDomainConfObj.ID;
    var IDService = global.app.services.getService(idModuleName);
    var apiKey = req.apiDomainConfObj.entId + "-" + req.apiDomainConfObj.appId + "-AnonymousAPIs";
    // Anonymous API abuse

    if (idModuleName == "") {
        logger.trace("No ID Module is Configured for %s enterprise", req.apiDomainConfObj.enterpriseName);
        callback(true);
    } else {
        RedisCache.checkExists(apiKey, function (isExist) {
            if (isExist) {
                RedisCache.getHashVal(apiKey, function (result) {
                    var urls = req.url;
                    var apiMethod = req.method;
                    var regex = [result.regex];
                    var method = [result.method];
                    var reg = RegExp(regex.join("|"), "g");
                    var methodReg = RegExp(method.join("|"), "g");
                    if (urls.match(reg) && apiMethod.match(methodReg)) {
                        logger.trace("API %s of %s_%s present in Id file", urls, req.apiDomainConfObj.entId, req.apiDomainConfObj.appId);
                        req.anonymousAPI = true;
                        callback(true);
                    } else {

                        req.anonymousAPI = false;
                        // Call ID Service for auth request inspection
                        IDService.authenticateRequest(req, res, function (authResult) {
                            callback(authResult);
                        });
                    }
                });
            } else {
                req.anonymousAPI = false;
                IDService.authenticateRequest(req, res, function (authResult) {
                    callback(authResult);
                });
            }
        });
    }
}

//
//Function to block request and send appropriate error message to user
//
function blockRequest(res, statusCode, message) {
    res.writeHead(statusCode);
    res.write(message);
    res.end();
}

// Interface
module.exports = {
    init: init,
    validateRequest: validateRequest,
    blockRequest: blockRequest
};
