/**
 * Accepts the incoming request, validate it and then forward to  RelayModuleService
 * Created by API Defender on 6/10/2015
 * @version 1.0
 */

// Dependencies
var http = require("http");
var log4js = require("log4js");
var path = require("path");
var os = require("os");
var config = require("config");

// Logger
var logger = log4js.getLogger("DirectorRelayController");

// Service Dependencies
var directorService = global.app.services.getService("Director");
var relayService = global.app.services.getService("Relay");
var RESTHelper = require("../utils/RESTHelper");

// Response error config
var ResErrConf = require("../config/ErrorResponse/config");

//
// Lifecycle Init Handler
//
function init() {
    logger.debug("DirectorRelayController Initialization");
}
var relay;

//
// function to validate the request, forward OR Discard/Block the request based on the result
//
function requestVerification(req, res, next) {
    // Traffic Enforcer Controller
    var TrafficEnforcerController = global.app.controllers.getController("TrafficEnforcerController");
    // Block the request until you get ID module"s response
    // Delegate to Service
    directorService.validateRequest(req, res, function (authResult) {

        if (!authResult) {

            RESTHelper.sendUnAuthorized(req, res);
            logger.debug("ResponseStatusCode=%s", res.statusCode);
            return;
        }

        // Function to print Blocked and Flagged Security Plugins.
        function catSecurityPlugins(securityPlugins, actionType) {
            var resResult = "";
            securityPlugins.forEach(function (securityPlugin) {
                resResult += ", " + actionType + "SecurityPlugin=" + securityPlugin;
            });
            return resResult;
        }

        // Delegate to Service
        TrafficEnforcerController.enforceTraffic(req, function callback(reqResult) {
            //Take decision based on Inspection result
            if (reqResult == "flag" || reqResult == "allow") {

                // Creating new Request object from old for proxy
                var newRequest = new http.IncomingMessage();
                newRequest.httpVersion = req.httpVersion;
                newRequest.method = req.method;
                newRequest.cookies = req.cookies;
                newRequest.url = req.url;
                newRequest.socket = req.socket;

                // Custom request values
                newRequest.apiDomainConfObj = req.apiDomainConfObj;
                newRequest.user_name = req.user_name;
                newRequest.anonymousAPI = req.anonymousAPI;
                newRequest.API = req.API;
                newRequest.APIKey = req.APIKey;
                newRequest.SecPluginLogs = req.SecPluginLogs;
                newRequest.reqResult = reqResult;

                // copy original request headers to new request
                for (var key in req.headers) {
                    if (req.headers.hasOwnProperty(key) && key != "accept-encoding") {
                        newRequest.headers[key] = req.get(key)
                    }
                }

                // Assign actual request body to newly created request
                var body = "";
                if (req.method != "GET") {
                    if (req.method != "DELETE") {
                        body = req.body;
                    }
                }
                if (typeof body == "string") {
                    newRequest.body = body;
                    var size = Buffer.byteLength(body, "utf8");
                    newRequest.headers["content-length"] = size;
                }

                // Forward request to back-end server and get response
                relayService.forwardRequest(newRequest, res, function (proxRes, resBody) {

                    TrafficEnforcerController.inspectResponseTraffic(proxRes, resBody, function (resResult) {
                        if (resResult == "flag" || resResult == "allow") {
                            if (resResult != "flag") {
                                resResult = reqResult;
                            }
                            // copy proxy response headers first
                            try {
                                for (var key in proxRes.headers) {
                                    if (proxRes.headers.hasOwnProperty(key)) {
                                        res.setHeader(key, proxRes.headers[key])
                                    }
                                }
                            } catch (err) {
                                logger.error(err);
                            }
                            logger.debug("API=%s, Method=%s, APIKey=%s, EnterpriseName=%s, AppName=%s, EnterpriseId=%s, ApplicationId=%s, Tag=%s, Inspection=%s, Blocked=%s, Flagged=%s, StatusCode=%s, StatusValue=%s%s", req.API, req.method, req.APIKey, req.apiDomainConfObj.enterpriseName, req.apiDomainConfObj.app_name, req.apiDomainConfObj.entId, req.apiDomainConfObj.appId, req.apiDomainConfObj.category, proxRes.SecPluginLogs.Inspection, proxRes.SecPluginLogs.Blocked, proxRes.SecPluginLogs.Flagged, res.statusCode, (resResult == "allow") ? "Allowed" : "Flagged", catSecurityPlugins(req.SecPluginLogs.FlaggedSecurityPlugins, "Flagged"));
                            res.end(resBody);
                        } else {
                            RESTHelper.sendUnAuthenticated(req, res);
                            logger.debug("API=%s, Method=%s, APIKey=%s, EnterpriseName=%s, AppName=%s, EnterpriseId=%s, ApplicationId=%s, Tag=%s, Inspection=%s, Blocked=%s, Flagged=%s, StatusCode=%s, StatusValue=Blocked%s", req.API, req.method, req.APIKey, req.apiDomainConfObj.enterpriseName, req.apiDomainConfObj.app_name, req.apiDomainConfObj.entId, req.apiDomainConfObj.appId, req.apiDomainConfObj.category, proxRes.SecPluginLogs.Inspection, proxRes.SecPluginLogs.Blocked, proxRes.SecPluginLogs.Flagged, res.statusCode, catSecurityPlugins(proxRes.SecPluginLogs.BlockedSecurityPlugins, "Blocked"), catSecurityPlugins(proxRes.SecPluginLogs.FlaggedSecurityPlugins, "Flagged"));
                            logger.trace("Response status code: %s", res.statusCode);
                        }
                    });
                });
            } else {
                // Block the request

                RESTHelper.sendUnAuthenticated(req, res);
                logger.debug("API=%s, Method=%s, APIKey=%s, EnterpriseName=%s, AppName=%s, EnterpriseId=%s, ApplicationId=%s, Tag=%s, Inspection=%s, Blocked=%s, Flagged=%s, StatusCode=%s, StatusValue=Blocked%s%s", req.API, req.method, req.APIKey, req.apiDomainConfObj.enterpriseName, req.apiDomainConfObj.app_name, req.apiDomainConfObj.entId, req.apiDomainConfObj.appId, req.apiDomainConfObj.category, req.SecPluginLogs.Inspection, req.SecPluginLogs.Blocked, req.SecPluginLogs.Flagged, res.statusCode, catSecurityPlugins(req.SecPluginLogs.BlockedSecurityPlugins, "Blocked"), catSecurityPlugins(req.SecPluginLogs.FlaggedSecurityPlugins, "Flagged"));
                logger.trace("Response status code: %s", res.statusCode);
            }
        });
    });
}

//
// Health Check Endpoint: disabled currently
//
function sysStatus(req, res, next) {
    var upTime = os.uptime();
    var date = new Date(upTime);
    res.send("System up since " + date + ".");
    return;
}

// Interface
module.exports = {
    "init": init,
    "requestVerification": requestVerification,
    "sysStatus": sysStatus
};
