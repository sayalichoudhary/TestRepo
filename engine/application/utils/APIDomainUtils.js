/**
 * Access App Relay from AppRelayConf file and performs search operation for given entity in config
 * Created by API Defender on 30/03/16
 * @version 1.0
 */

// Dependencies
var log4js = require('log4js');
var path = require('path');
var config = require('config');
var stripJsonComments = require('strip-json-comments');
var fs = require("fs");
var url = require("url");

// Logger
var logger = log4js.getLogger('ApplicationRelayUtils');

//
// Cache of Application relay config ref
//
var APIDomainConfig;
var appRelayConf = {};

//
// Loads API Domian channels from Application-relay config
//
function init() {
    logger.debug("Initializing ApplicationRelayUtils");
    var apiDomainConfigPath = path.join(global.appRoot, config.get('APIDomainConfLoc'));
    var contents = fs.readFileSync(apiDomainConfigPath, 'utf8');
    APIDomainConfig = JSON.parse(contents);

    var apiDomainConf = APIDomainConfig.apiDomainConf;
    for (var conf in apiDomainConf) {

        var apiDomainId = apiDomainConf[conf].apiDomainId;
        appRelayConf[apiDomainId] = apiDomainConf[conf];

    }
}

//
// Function to fetch conf object with host and URL path.
//
function getAPIDomainByHostAndURL(reqHost, reqPath) {
    var relay = null;
    // Validate incoming
    if (!reqHost) {
        return false;
    } else if (!reqPath) {
        return false;
    }

    // Remove port number from host string if present.
    if (reqHost.indexOf(":") != -1) {
        reqHost = reqHost.substring(0, reqHost.indexOf(":"));
    }

    // Lookup in the App Relay Conf
    var apiDomainConf = APIDomainConfig.apiDomainConf;
    for (var conf in apiDomainConf) {
        var rDomain = apiDomainConf[conf].request_domain;
        var regDomain = RegExp(rDomain, 'g');
        var regexPath = apiDomainConf[conf].request_path;
        var regPath = new RegExp(regexPath, 'g');
        //reqHost == rDomain or reqHost.match(regDomain) != null

        if (reqHost.match(regDomain) != null && reqPath.match(regPath) != null) {

            relay = apiDomainConf[conf];
            break;
        }
    }

    if (null == relay) {
        relay = appRelayConf[''];
    }
    return relay;
}

//
// Function to fetch conf object with relay id.
//
function getAPIDomainObjectByAPIDomainId(apiDomainId) {

    // Validation
    if (!apiDomainId) {
        return false;
    }

    // Lookup in the App Relay Conf Map
    var apiDomainConf = appRelayConf[apiDomainId];
    if (apiDomainConf == null) {
        // Return default relay object if the domain specific not available.
        return appRelayConf['default'];
    } else {
        return apiDomainConf;
    }

}

//
// Function to replace the escape characters from the given string to the special characters
//
function replaceEscapeChars(actualValue) {
    actualValue.replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    return actualValue;
}

//
// Function to replace the special characters from the given string to the escape characters
//
function replaceSpecialChars(actualValue) {
    actualValue.replace(/</g, "&lt;")
        .replace(/&/g, "&amp;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, '&quot;')
        .replace(/'/g, "&apos;");
    return actualValue;
}

//
// Interface
//
module.exports = {
    init: init,
    getAPIDomainByHostAndURL: getAPIDomainByHostAndURL,
    getAPIDomainObjectByAPIDomainId: getAPIDomainObjectByAPIDomainId,
    replaceEscapeChars: replaceEscapeChars,
    replaceSpecialChars: replaceSpecialChars
};