/**
 * Loads Application-Relay config into memory, creates target endpoint URL and forwards request to target host
 * Created by API Defender on 12/11/2015
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

var RESTHelper = require("../utils/RESTHelper");

// Logger
var logger = log4js.getLogger("RelayService");
var RedisCache;

//
// Constructor for service
//
function init() {
    logger.debug("Forward request to actual Domain");
    RedisCache = global.app.redisCache;
}

//
// Function to forward request to target server
//
function forwardRequest(req, res, callback) {
    var TrafficEnforcerController = global.app.controllers.getController("TrafficEnforcerController");
    // Extract host and URL from incoming request
    var host = req.headers["host"];
    var URLPath = url.parse(req.url, true).path;

    // Get Relay Object from RelayObjectMap for the host
    var apiDomainObj = app.apiDomainUtil.getAPIDomainObjectByAPIDomainId(req.apiDomainConfObj.apiDomainId);
    req.apiDomainConfObj = apiDomainObj;

    // Retrieve Config data from Relay object
    var reqHost = req.apiDomainConfObj.target;
    var reqPort = req.apiDomainConfObj.target_port;
    var reqPath = req.apiDomainConfObj.target_path ? req.apiDomainConfObj.target_path : req.url;
    var reqMethod = req.method;

    var reqBody = "";
    if (reqMethod != "GET") {
        if (req.method != "DELETE") {
            reqBody = req.body;
        }
    }
    // Create target server endpoint host URL
    var serverUrl = "";
    var targetDomain = ((reqHost.indexOf("://") > -1) ? reqHost : (req.headers["x-forwarded-proto"] == "https") ? "https://" + reqHost + "" : "http://" + reqHost);
    var targetPort = (reqPort && req.headers["x-forwarded-proto"] == "https" ? ":" + reqPort : "");
    serverUrl = targetDomain + targetPort + reqPath;
    logger.trace(serverUrl);

    //var certFile = path.resolve(__dirname, "../../ssl_certs/enterprise.mobileo2.com");
    //var keyFile = path.resolve(__dirname, "../../ssl_certs/mobileo2.com.key");

    // Function to print Blocked and Flagged Security Plugins.
    function catSecurityPlugins(securityPlugins, actionType) {
        var result = "";

        securityPlugins.forEach(function (securityPlugin) {
            result += ", " + actionType + "SecurityPlugin=" + securityPlugin;
        });
        return result;
    }

    try {
        req.headers.host = (reqHost.indexOf("://") > -1) ? reqHost.split("//")[1] : reqHost;
        request({
            url: serverUrl.toString(),
            method: reqMethod.toString(),
            body: reqBody.toString(),
            headers: req.headers,
            cookies: req.cookies,
            followRedirect: false,
            //cert: fs.readFileSync(certFile),
            //key: fs.readFileSync(keyFile),
            rejectUnauthorized: false
        }, function (error, response, resBody) {
            if (error) {
                logger.error(error);
                RESTHelper.sendBadGateway(req, res);
                return;
            }
            else if (response.statusCode >= 300 && response.statusCode < 310) {
                response.apiDomainConfObj = req.apiDomainConfObj;
                response.anonymousAPI = req.anonymousAPI;
                response.API = req.API;
                response.APIKey = req.APIKey;
                response.method = req.method;
                response.SecPluginLogs = req.SecPluginLogs;

                TrafficEnforcerController.inspectResponseTraffic(response, resBody, function (resResult) {
                    if (resResult == "flag" || resResult == "allow") {
                        if (resResult != "flag") {
                            resResult = req.reqResult;
                        }

                        // copy proxy response headers first
                        try {
                            for (var key in response.headers) {
                                if (response.headers.hasOwnProperty(key)) {
                                    res.setHeader(key, response.headers[key])

                                }
                            }
                        } catch (err) {
                            logger.error(err);
                        }
                        logger.debug("API=%s, Method=%s, APIKey=%s, EnterpriseName=%s, AppName=%s, EnterpriseId=%s, ApplicationId=%s, Tag=%s, Inspection=%s, Blocked=%s, Flagged=%s, StatusCode=%s, StatusValue=%s%s", req.API, req.method, req.APIKey, req.apiDomainConfObj.enterpriseName, req.apiDomainConfObj.app_name, req.apiDomainConfObj.entId, req.apiDomainConfObj.appId, req.apiDomainConfObj.category, response.SecPluginLogs.Inspection, response.SecPluginLogs.Blocked, response.SecPluginLogs.Flagged, res.statusCode, (resResult == "allow") ? "Allowed" : "Flagged", catSecurityPlugins(req.SecPluginLogs.FlaggedSecurityPlugins, "Flagged"));
                        res.end(resBody);

                    } else {
                        RESTHelper.sendUnAuthenticated(req, res);
                        logger.debug("API=%s, Method=%s, APIKey=%s, EnterpriseName=%s, AppName=%s, EnterpriseId=%s, ApplicationId=%s, Tag=%s, Inspection=%s, Blocked=%s, Flagged=%s, StatusCode=%s, StatusValue=Blocked%s", req.API, req.method, req.APIKey, req.apiDomainConfObj.enterpriseName, req.apiDomainConfObj.app_name, req.apiDomainConfObj.entId, req.apiDomainConfObj.appId, req.apiDomainConfObj.category, response.SecPluginLogs.Inspection, response.SecPluginLogs.Blocked, response.SecPluginLogs.Flagged, res.statusCode, catSecurityPlugins(response.SecPluginLogs.BlockedSecurityPlugins, "Blocked"), catSecurityPlugins(response.SecPluginLogs.FlaggedSecurityPlugins, "Flagged"));
                    }
                });

            } else {
                // Copy enterprise and application id from request to response
                response.apiDomainConfObj = req.apiDomainConfObj;
                response.anonymousAPI = req.anonymousAPI;
                response.API = req.API;
                response.APIKey = req.APIKey;
                response.method = req.method;
                response.SecPluginLogs = req.SecPluginLogs;
                callback(response, resBody);
            }
        });
    } catch (exp) {
        logger.error(exp);
        RESTHelper.sendBadGateway(req, res);
        return;
    }
}

// Interface
module.exports = {
    init: init,
    forwardRequest: forwardRequest
};
