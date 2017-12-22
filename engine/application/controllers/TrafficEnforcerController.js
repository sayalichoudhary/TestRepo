/**
 * Inspects incoming requests/response by appying security plugin instances, blocks or allows the request accordingly
 * Created by API Defender on 11/10/2015
 * @version 1.0
 */

// Dependencies
var log4js = require("log4js");
var path = require("path");
var url = require("url");
var Constants = require("../utils/Constants");
var Log4js = require("log4js");
// Logger
var logger = log4js.getLogger("TrafficEnforcerController");

//
// Lifecycle Init Handler
//
function init() {
    logger.debug("Default Controller Initialization");
}
// Service and Slot class references
var securityPolicyLoader = global.app.services.getService("SecurityPolicyLoader");
var URLSlot = app.slots.getSlot(Constants.SlotNames.URL);
var BodyFormSlot = app.slots.getSlot(Constants.SlotNames.Body);
var HeaderSlot = app.slots.getSlot(Constants.SlotNames.Header);
var IpBlackListSlot = app.slots.getSlot(Constants.SlotNames.Ip);
var ResponseBodySlot = app.slots.getSlot(Constants.SlotNames.ResponseBody);
var ResponseHeaderSlot = app.slots.getSlot(Constants.SlotNames.ResponseHeader);
var BruteForceSlot = app.slots.getSlot(Constants.SlotNames.BruteForce);
var WeakPasswordSlot = app.slots.getSlot(Constants.SlotNames.WeakPassword);
var CSRFSlot = app.slots.getSlot(Constants.SlotNames.CSRF);
var SessionHijackSlot = app.slots.getSlot(Constants.SlotNames.SessionHijack);
var SessionFixationSlot = app.slots.getSlot(Constants.SlotNames.SessionFixation);
var StaleSessionTokenSlot = app.slots.getSlot(Constants.SlotNames.StaleSessionToken);

//
// Function to inspect incoming request before forwarding it to target server
//


function enforceTraffic(req, callback) {
    var secPluginType;
    var result = "allow";
    var finalResult = "allow";
    var entInspectorId;
    entInspectorId = req.apiDomainConfObj.entId + "_" + req.apiDomainConfObj.appId;
    // Inspection Slots
    var SecurityPlugins = securityPolicyLoader.getAllSecurityPluginObjectSL(entInspectorId);
    if (SecurityPlugins == undefined) {
        SecurityPlugins = global.SecurityPlugins;
    }
    // Data for URL slot
    var URLPath, domain, query, formData;
    var host, referer, userAgent, cookies, headers, reqMethod;

    var SecPluginLogs = {
        "Inspection": 0,
        "Blocked": 0,
        "Flagged": 0,
        "BlockedSecurityPlugins": [],
        "FlaggedSecurityPlugins": []
    };

    // It set finalResult, based on high priority.
    function finalResultCheck() {
        if ((finalResult == "flag" || finalResult == "allow") && result == "block") {
            finalResult = result;
        } else if (finalResult == "allow" && result == "flag") {
            finalResult = result;
        }
    }

    query = req.url.split("?")[1];
    formData = bodyType(req.body);
    URLPath = req.url;
    domain = req.headers.host;
    // Header check data
    headers = req.headers;
    reqMethod = req.method;

    app.geoIpUtil.insecureOrigin(req, function (countryCode) {
        if (countryCode == false) {
            result = false;
        }
        try {
            var rulesArr = JSON.parse("[" + SecurityPlugins.ruleSets + "]");
            for (var ruleIndex in rulesArr) {

                secPluginType = rulesArr[ruleIndex].slot.slotId;
                var headerName = rulesArr[ruleIndex].slot.name;
                var secPluginObj;
                // Type of slot
                if (secPluginType == "URL") {
                    secPluginObj = new URLSlot();
                } else if (secPluginType == "BODY") {
                    secPluginObj = new BodyFormSlot();
                } else if (secPluginType == "HEADER") {
                    secPluginObj = new HeaderSlot();
                    if (headerName != undefined) {
                        secPluginObj.setAuthCheck(true);
                    } else {
                        secPluginObj.setAuthCheck(false);
                    }
                } else if (secPluginType == "INSECURE_ORIGIN") {
                    secPluginObj = new IpBlackListSlot();
                } else if (secPluginType == "BRUTE_FORCE") {
                    secPluginObj = new BruteForceSlot();
                } else if (secPluginType == "WEAK_PASS") {
                    secPluginObj = new WeakPasswordSlot();
                } else if (secPluginType == "CSRF") {
                    secPluginObj = new CSRFSlot();
                } else if (secPluginType == "SESSION_HIJACK") {
                    secPluginObj = new SessionHijackSlot();
                } else if (secPluginType == "SESSION_FIXATION") {
                    secPluginObj = new SessionFixationSlot();
                } else if (secPluginType == "STALE_CLIENT_SESSION_TOKEN") {
                    secPluginObj = new StaleSessionTokenSlot();
                } else {
                }

                if (undefined != secPluginObj) {
                    var exp = [rulesArr[ruleIndex].slot.pattern];
                    var regExp = new RegExp(exp.join("|"), "i");
                    var id = secPluginObj.setId(rulesArr[ruleIndex].slot.slotId + "_" + rulesArr[ruleIndex].ruleId);
                    secPluginObj.setPatterns(regExp);
                    secPluginObj.setAction(rulesArr[ruleIndex].slot.action);
                    var securityPlugin = rulesArr[ruleIndex].ruleId.split("-")[0];
                }

                switch (secPluginType) {
                    case "URL":
                        result = secPluginObj.executeSlot(URLPath, domain, query, req, securityPlugin, SecPluginLogs);
                        break;
                    case "BODY":
                        result = secPluginObj.executeSlot(formData, req, securityPlugin, SecPluginLogs);
                        break;
                    case "HEADER":
                        result = secPluginObj.executeSlot(headers, headerName, req, securityPlugin, SecPluginLogs);
                        break;
                    case "INSECURE_ORIGIN":
                        result = secPluginObj.executeSlot(countryCode, req, securityPlugin, SecPluginLogs);
                        break;
                    case "BRUTE_FORCE" :
                        var slotParam = rulesArr[ruleIndex].slot;
                        secPluginObj.executeSlot(req, slotParam, headerName, securityPlugin, SecPluginLogs, function (bruteResult) {
                            result = bruteResult;
                            finalResultCheck();
                        });
                        break;
                    case "WEAK_PASS":
                        result = secPluginObj.executeSlot(headerName, formData, req, securityPlugin, SecPluginLogs);
                        break;
                    case "CSRF":
                        result = secPluginObj.executeSlot(reqMethod, headers, headerName, req, securityPlugin, SecPluginLogs);
                        break;
                    case "SESSION_HIJACK":
                        secPluginObj.executeSlot(headers, headerName, req, securityPlugin, SecPluginLogs, function (hijackResult) {
                            result = hijackResult;
                            finalResultCheck();
                        });
                        break;
                    case "SESSION_FIXATION":
                        secPluginObj.executeSlot("REQ", headers, req, securityPlugin, SecPluginLogs, function (fixationResult) {
                            result = fixationResult;

                            finalResultCheck();
                        });
                        break;
                    case "STALE_CLIENT_SESSION_TOKEN":
                        var slotParam = rulesArr[ruleIndex].slot;
                        secPluginObj.executeSlot("REQ", headers, headerName, slotParam, req, securityPlugin, SecPluginLogs, function (StaleSessionResult) {
                            result = StaleSessionResult;
                            finalResultCheck();
                        });
                        break;
                    default :
                }
                //logger.info("Result : ", rulesArr[ruleIndex].ruleId, result);
                if ((finalResult == "flag" || finalResult == "allow") && result == "block") {
                    finalResult = result;
                } else if (finalResult == "allow" && result == "flag") {
                    finalResult = result;
                }
            }

        } catch (err) {
            // Set result to true if there are no inspection slot for the application in a particular enterprise
            if (SecurityPlugins == undefined) {
                finalResult = "allow";
            } else {
                finalResult = "block";
            }
            logger.error(err);
        }

        setTimeout(function () {
            logger.trace("Final result of Request: %s", finalResult);
            req.SecPluginLogs = SecPluginLogs;
            callback(finalResult);
        }, 10);
    });
}


//
// Function to inspect response before sending it back to the client
//
function inspectResponseTraffic(response, body, callback) {

    var result = "allow";
    var finalResult = "allow";
    var entInspectorId = response.apiDomainConfObj.entId + "_" + response.apiDomainConfObj.appId;
    var headers = response.headers;
    var SecPluginLogs = {
        "Inspection": response.SecPluginLogs.Inspection,
        "Blocked": response.SecPluginLogs.Blocked,
        "Flagged": response.SecPluginLogs.Flagged,
        "BlockedSecurityPlugins": [],
        "FlaggedSecurityPlugins": response.SecPluginLogs.FlaggedSecurityPlugins
    };

    // Inspection Slots
    var SecurityPlugins = securityPolicyLoader.getAllSecurityPluginObjectSL(entInspectorId);
    if (SecurityPlugins == undefined) {
        SecurityPlugins = global.InspectionSlot;
    }

    // It set finalResult, based on high priority.
    function finalResultCheck() {
        if ((finalResult == "flag" || finalResult == "allow") && result == "block") {
            finalResult = result;
        } else if (finalResult == "allow" && result == "flag") {
            finalResult = result;
        }
    }

    try {
        var rulesArr = JSON.parse("[" + SecurityPlugins.ruleSets + "]");
        var secPluginObj;
        for (var ruleIndex in rulesArr) {
            var secPluginType = rulesArr[ruleIndex].slot.slotId;
            var exp, regExp, headerName;

            var securityPlugin = rulesArr[ruleIndex].ruleId.split("-")[0];
            if (secPluginType == "RESPONSE_BODY") {
                secPluginObj = new ResponseBodySlot();
            } else if (secPluginType == "RESPONSE_HEADER") {
                secPluginObj = new ResponseHeaderSlot();
            } else if (secPluginType == "SESSION_FIXATION") {
                secPluginObj = new SessionFixationSlot();
            } else if (secPluginType == "STALE_SERVER_SESSION_TOKEN") {
                secPluginObj = new StaleSessionTokenSlot();
            }
            if (undefined != secPluginObj) {
                headerName = "";
                exp = rulesArr[ruleIndex].slot.pattern.split("%,");
                regExp = new RegExp(exp.join("|"), "i");
                secPluginObj.setId(rulesArr[ruleIndex].slot.slotId + "_" + rulesArr[ruleIndex].ruleId);
                secPluginObj.setPatterns(regExp);
                secPluginObj.setAction(rulesArr[ruleIndex].slot.action);
                headerName = rulesArr[ruleIndex].slot.name;
            }

            switch (secPluginType) {
                case "RESPONSE_BODY":
                    result = secPluginObj.executeSlot(headerName, body, exp, response, securityPlugin, SecPluginLogs);
                    break;
                case "RESPONSE_HEADER":
                    result = secPluginObj.executeSlot(response, headerName, securityPlugin, SecPluginLogs);
                    break;
                case "SESSION_FIXATION":
                    secPluginObj.executeSlot("RES", headers, response, securityPlugin, SecPluginLogs, function (fixationResult) {
                        result = fixationResult;
                        finalResultCheck();
                    });
                    break;
                case "STALE_SERVER_SESSION_TOKEN":
                    var slotParam = rulesArr[ruleIndex].slot;
                    secPluginObj.executeSlot("RES", headers, headerName, slotParam, response, securityPlugin, SecPluginLogs, function (StaleSessionResult) {
                        result = StaleSessionResult;
                        finalResultCheck();
                    });
                    break;
                default :
            }
            //logger.info("Result response: ", rulesArr[ruleIndex].ruleId, result);

            if ((finalResult == "flag" || finalResult == "allow") && result == "block") {
                finalResult = result;
            } else if (finalResult == "allow" && result == "flag") {
                finalResult = result;
            }
        }
    } catch (err) {
        logger.error(err);
        if (SecurityPlugins == undefined) {
            finalResult = "allow";
        } else {
            finalResult = "block";
        }
    }
    setTimeout(function () {
        logger.trace("Final result of Response: %s", finalResult);
        response.SecPluginLogs = SecPluginLogs;
        callback(finalResult);
    }, 5);
}

//
// Find what type of body it is like(formData, XML, JSON).
//

function bodyType(body) {
    var bodyData = body;
    var body = JSON.stringify(body);
    var data;
    if (body.indexOf("filename") > -1 && body.indexOf(".json") > -1) {
        var start = bodyData.indexOf("{");
        var last = bodyData.lastIndexOf("}");
        data = bodyData.substring(start, last + 1);
        if (data == "") {
            if (start != -1 && last != -1) {
                return body;
            }
        }
    } else if (body.indexOf("filename") > -1 && body.indexOf(".xml") > -1) {
        var start = bodyData.indexOf("<");
        var last = bodyData.lastIndexOf(">");
        data = bodyData.substring(start, last + 1);
        if (data == "") {
            if (start != -1 && last != -1) {
                return body;
            }
        }
    } else {
        data = body;
    }
    if (data == "") {
        return null;
    }
    return data;
}

// Interface
module.exports = {
    init: init,
    enforceTraffic: enforceTraffic,
    inspectResponseTraffic: inspectResponseTraffic
};