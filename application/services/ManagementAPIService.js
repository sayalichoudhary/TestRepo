/**
 * Stores all Polices, Identities in Redis cache, stores ssl certs and performs CRUD operations on Application-relay config
 * Created by API Defender on 07/10/2015
 * @version 1.0
 */

// Dependencies
var log4js = require("log4js");
var config = require("config");
var Constants = require("../utils/Constants");
var path = require("path");
var fs = require("fs");
//Logger
var logger = log4js.getLogger("ManagementAPIService");

var RESTHelper = require("../utils/RESTHelper");

// Response error config
var ResErrConf = require("../config/ErrorResponse/config");

// Variable declaration
var RedisCache = global.app.redisCache;
var isKeyExist;
var rulesArr;
var masterKey;
var newRulesArr = [];
var updatedRuleSet = [];
var entRuleSet = {};
var listOfEnt = undefined;
var listOfKeys = undefined;

//
// Constructor of service
//
function init() {
    logger.debug("Initiating ManagementAPI API service ...");
}

//
// Function to identify Slot type and create Inspector object accordingly
//
function policyKeyValueInRedis(enterpriseId, applicationId, ruleId, slotId, name, pattern, action, count, duration, isLastRule, isLastApp, isLastEnt, extSrcArr, idSrcArr) {
    var key = enterpriseId + "_" + applicationId;
    var isNew = true;

    // Change escape characters to there actual values
    app.apiDomainUtil.replaceEscapeChars(pattern);

    // To get all keys from Redis
    // @param  : regular expression
    // @param  : callback (return list of keys matches to regExp)
    RedisCache.getAllKeys("" + config.get("keys.enterpriseKey") + "[^a-z][^a-z][^a-z]_*", function (allEnterprises) {
        if (listOfEnt == undefined) {
            listOfEnt = allEnterprises;
        }
    });

    // Check key is present in Redis
    // @param  : key
    // @param  : callback
    RedisCache.checkExists(key, function (reply) {
        isKeyExist = reply;
        // If key is present in Redis
        if (isKeyExist) {
            RedisCache.getAllKeys("" + enterpriseId + "_*", function (list) {
                if (listOfKeys == undefined) {
                    listOfKeys = list;
                }
            });

            var isNewRule = true;
            isNew = false;
            masterKey = key;

            // Fetch the value of key
            // @param  : key
            // @param  : callback(return the value of key)
            RedisCache.getHashVal(key, function (object) {
                entRuleSet = object;
                if (rulesArr == undefined) {
                    rulesArr = JSON.parse("[" + object.ruleSets + "]");
                }
                var rule = {
                    "ruleId": ruleId,
                    "slot": {
                        "slotId": slotId,
                        "name": name,
                        "pattern": pattern,
                        "action": action,
                        "conditional": null,
                        "time": null,
                        "count": count,
                        "duration": duration
                    }
                };
                for (var i = 0; i < rulesArr.length; i++) {
                    if (rulesArr[i].ruleId == ruleId) {
                        updatedRuleSet.push(JSON.stringify(rule));
                        isNewRule = false;
                        break;
                    }
                }
                // Add new Rules
                if (isNewRule) {
                    newRulesArr.push(JSON.stringify(rule));
                }
                // To delete key from redis
                if (isLastApp) {
                    if (listOfKeys != undefined) {
                        for (var i = 0; i < listOfKeys.length; i++) {
                            RedisCache.delHash(listOfKeys[i]);
                        }
                        listOfKeys = undefined;
                    }
                }

                // To delete an enterprise from redis
                if (listOfEnt != undefined && isLastEnt) {
                    for (var ent = 0; ent < listOfEnt.length; ent++) {
                        RedisCache.delHash(listOfEnt[ent]);
                    }
                    listOfEnt = undefined;
                }

                if (isLastRule) {
                    // Is application exist or not
                    if (listOfKeys != undefined) {
                        for (var app = 0; app < listOfKeys.length; app++) {
                            if (!(key.localeCompare(listOfKeys[app]))) {
                                listOfKeys.splice(app, 1);
                            }
                        }
                    }

                    // Is enterprise exist or not
                    if (listOfEnt != undefined) {
                        for (var ent = 0; ent < listOfEnt.length; ent++) {
                            if (!(key.localeCompare(listOfEnt[ent]))) {
                                listOfEnt.splice(ent, 1);
                            }
                        }
                    }
                    // append new rules in existing rule set
                    if (newRulesArr.length > 0) {
                        newRulesArr = JSON.stringify(JSON.parse("[" + newRulesArr + "]"));
                        var start = newRulesArr.indexOf("{");
                        var last = newRulesArr.lastIndexOf("}");
                        var newRulesStr = newRulesArr.substring(start, last + 1);
                        entRuleSet.ruleSets = updatedRuleSet + "," + newRulesStr;
                    } else {
                        entRuleSet.ruleSets = updatedRuleSet;
                    }
                    newRulesArr = [];
                    rulesArr = undefined;
                    updatedRuleSet = [];

                    if (entRuleSet != undefined && masterKey != undefined) {
                        RedisCache.setHashVal(key, entRuleSet);
                        entRuleSet = {"externalSource": [], "idSources": [], "ruleSets": []};
                    }
                }
            });
        } else {
            if (masterKey !== key) {
                masterKey = key;
                entRuleSet = {"externalSource": [], "idSources": [], "ruleSets": []};
                var rule = {
                    "ruleId": ruleId,
                    "slot": {
                        "slotId": slotId,
                        "name": name,
                        "pattern": pattern,
                        "action": action,
                        "conditional": null,
                        "time": null,
                        "count": count,
                        "duration": duration
                    }
                };
                // Add external Sources in Application
                if (extSrcArr != undefined) {
                    for (var i = 0; i < extSrcArr.length; i++) {
                        entRuleSet.externalSource.push(JSON.stringify(extSrcArr[i]));
                    }
                }
                // Add Id Sources in Application
                if (idSrcArr != undefined) {
                    for (var i = 0; i < idSrcArr.length; i++) {
                        entRuleSet.idSources.push(JSON.stringify(idSrcArr[i]));
                    }
                }
                // Add rule in rule set for the first time
                entRuleSet.ruleSets.push(JSON.stringify(rule));

            } else {
                var rule = {
                    "ruleId": ruleId,
                    "slot": {
                        "slotId": slotId,
                        "name": name,
                        "pattern": pattern,
                        "action": action,
                        "conditional": null,
                        "time": null,
                        "count": count,
                        "duration": duration
                    }
                };
                entRuleSet.ruleSets.push(JSON.stringify(rule));
            }
        }
        if (isLastRule && isNew) {
            if (entRuleSet != undefined && masterKey != undefined) {
                RedisCache.setHashVal(masterKey, entRuleSet);
            }
        }
    });
}

//
// Function to tetch policies from Policy file and pass them to store in Redis cache
//
function addPolicyObject(policyObject, filetype) {

    var SecurityPolicyLoader = global.app.services.getService("SecurityPolicyLoader");
    var pattern = "", action = "", slotId = "", ruleId = "", enterpriseId = "", applicationId = "", name = "",
        count = "", duration = "";
    var extSrcArr = [], idSrcArr = [];

    for (var i = 0; i < policyObject.policy.enterprisetipolicy.length; i++) { // Enterprise level
        if (filetype == "json") {
            enterpriseId = policyObject.policy.enterprisetipolicy[i].id;
        } else {
            enterpriseId = policyObject.policy.enterprisetipolicy[i].$.id;
        }
        var entLength = policyObject.policy.enterprisetipolicy.length;
        var appLength = policyObject.policy.enterprisetipolicy[i].applicationtipolicy.length;
        for (var j = 0; j < policyObject.policy.enterprisetipolicy[i].applicationtipolicy.length; j++) { // Application level
            if (filetype == "json") {
                applicationId = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].id;
            } else {
                applicationId = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].$.id;
            }
            if (filetype == "xml") {
                if (policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].externalsources != undefined) { // External source level
                    for (var extSrc = 0; extSrc < policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].externalsources.length; extSrc++) {
                        for (var value = 0; value < policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].externalsources[extSrc].name.length; value++) {
                            extSrcArr.push(policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].externalsources[extSrc].name[value]);
                        }
                    }
                }
                if (policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].idsources != undefined) { // ID source level
                    for (var idSrc = 0; idSrc < policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].idsources.length; idSrc++) {
                        for (var value = 0; value < policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].idsources[idSrc].name.length; value++) {
                            idSrcArr.push(policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].idsources[idSrc].name[value]);
                        }
                    }
                }
            }
            var ruleLength = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset.length;
            for (var k = 0; k < policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset.length; k++) { // Rule set level
                if (filetype == "json") {
                    ruleId = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].id;
                } else {
                    ruleId = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].$.id;
                }
                if (filetype == "json") {
                    slotId = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].slot.id;
                    name = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].slot.name;
                    pattern = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].filter.regex;
                    action = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].action.type;
                    count = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].action.count;
                    duration = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].action.duration;

                } else {
                    for (l = 0; l < policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].slot.length; l++) { // for SlotId and name
                        slotId = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].slot[l].$.id;
                        name = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].slot[l].$.name;
                    }

                    for (l = 0; l < policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].filter.length; l++) { // for Pattern
                        pattern = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].filter[l].$.regex;
                    }
                    for (l = 0; l < policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].action.length; l++) { // for action, count, duration
                        action = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].action[l].$.type;
                        count = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].action[l].$.count;
                        duration = policyObject.policy.enterprisetipolicy[i].applicationtipolicy[j].ruleset[k].action[l].$.duration;
                    }
                }
                // flag for rule
                var isLastRule = false;
                if (k == ruleLength - 1) {
                    isLastRule = true;
                }
                // flag for Application
                var isLastApp = false;
                if (j == appLength - 1 && k == ruleLength - 1) {
                    isLastApp = true;
                }
                // flag for Enterprise
                var isLastEnt = false;
                if (i == entLength - 1) {
                    isLastEnt = true;
                }
                if (slotId != "" && pattern != "" && action != "" && ruleId != "") {
                    policyKeyValueInRedis(enterpriseId, applicationId, ruleId, slotId, name, pattern, action, count, duration, isLastRule, isLastApp, isLastEnt, extSrcArr, idSrcArr);
                    slotId = "";
                    pattern = "";
                    action = "";
                    ruleId = "";
                    count = "";
                    duration = "";
                    extSrcArr = [];
                    idSrcArr = [];
                }
            }
        }
    }

    // Tab policy loader to refresh itself
    setTimeout(function () {
        RedisCache.setVal(Constants.cacheFlag, "true");
        SecurityPolicyLoader.refreshObjects();
    }, 500);
}// end of the addPolicyObject()

var identitySet;
var listOfIdentityKey;

//
// Function to add Identity Keys in Redis Cache
//
function identityKeyValueInRedis(enterpriseId, applicationId, identityKey, ikey, userId, isLastEnt, isLastApp, isLastId, isLastKey) {
    var key = ikey + "." + applicationId;
    RedisCache.getAllKeys("*.app[^a-z][^a-z][^a-z]", function (allIdentityKey) {
        if (listOfIdentityKey == undefined) {
            listOfIdentityKey = allIdentityKey;
            logger.debug("List of Identity keys  :  ", listOfIdentityKey);
        }
        RedisCache.checkExists(key, function (exists) {
            if (exists) {
                if (listOfIdentityKey != undefined) {
                    for (var i = 0; i < listOfIdentityKey.length; i++) {
                        if (listOfIdentityKey[i] == key) {
                            listOfIdentityKey.splice(i, 1);
                            break;
                        }
                    }
                }
            } else {
                identitySet = {
                    "identityKey": identityKey,
                    "userID": userId,
                    "enterpriseId": enterpriseId,
                    "applicationId": applicationId
                };
                RedisCache.setHashVal(key, identitySet);
            }

            if (isLastEnt && isLastApp && isLastId && isLastKey) {
                if (listOfIdentityKey != undefined) {
                    //for (var i = 0, j = listOfIdentityKey.length - 1; i != j; i++, j--) {
                    for (var i = 0; i < listOfIdentityKey.length; i++) {
                        RedisCache.delHash(listOfIdentityKey[i]);
                    }
                    logger.debug("Deleted Identity Keys  : ", listOfIdentityKey);
                    listOfIdentityKey = undefined;
                }
            }
        });
    });
}


//
// Function to fetch Identities from Identity file and pass them to store in cache
//
function addIdentityObject(identityObject, filetype) {
    var enterpriseId = "", applicationId = "", key = "", userId = "", regex = "", method = "";
    for (var i = 0; i < identityObject.identity.enterprisetipolicy.length; i++) { // Enterprise level
        if (filetype == "json") {
            enterpriseId = identityObject.identity.enterprisetipolicy[i].id;
        } else {
            enterpriseId = identityObject.identity.enterprisetipolicy[i].$.id;
        }
        var entLength = identityObject.identity.enterprisetipolicy.length;
        var appLength = identityObject.identity.enterprisetipolicy[i].applicationtipolicy.length;
        for (var j = 0; j < identityObject.identity.enterprisetipolicy[i].applicationtipolicy.length; j++) { // Application level
            if (filetype == "json") {
                applicationId = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].id;
            } else {
                applicationId = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].$.id;
            }
            var idKeyLength = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].identityKey.length;
            for (var k = 0; k < identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].identityKey.length; k++) { // Identity Level
                var identityKey = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].identityKey[k].$.id;
                var keyLength = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].identityKey[k].key.length;
                for (var l = 0; l < identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].identityKey[k].key.length; l++) { // Key Level
                    if (filetype == "xml") {
                        key = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].identityKey[k].key[l].$.id;
                        userId = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].identityKey[k].key[l]._;
                        var isLastEnt = false;
                        if (i == entLength - 1) {
                            isLastEnt = true;
                        }
                        var isLastApp = false;
                        if (j == appLength - 1) {
                            isLastApp = true;
                        }
                        var isLastId = false;
                        if (k == idKeyLength - 1) {
                            isLastId = true;
                        }
                        var isLastKey = false;
                        if (l == keyLength - 1) {
                            isLastKey = true;
                        }
                        if (key != "" && userId != "") {
                            identityKeyValueInRedis(enterpriseId, applicationId, identityKey, key, userId, isLastEnt, isLastApp, isLastId, isLastKey);
                            key = "";
                            userId = "";
                        }
                    }

                }
            }
            if (isLastKey) {
                var anonymousAPI = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].AnonymousAPIs;
                if (undefined != anonymousAPI) {
                    for (var k = 0; k < identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].AnonymousAPIs.length; k++) {
                        for (var l = 0; l < identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].AnonymousAPIs[k].api.length; l++) {
                            regex = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].AnonymousAPIs[k].api[l].$.regex;
                            method = identityObject.identity.enterprisetipolicy[i].applicationtipolicy[j].AnonymousAPIs[k].api[l].$.method;
                            var apiValue = {
                                "regex": regex,
                                "method": method
                            };
                            var key = enterpriseId + "-" + applicationId + "-AnonymousAPIs";
                            RedisCache.setHashVal(key, apiValue);
                        }
                    }
                }
            }
        }
    }
}


// APIDomain"s Methods

//
// Function to validate apiDomain"s key and values
//
function validateAPIDomain(apiDomain) {
    if (apiDomain.hasOwnProperty("apiDomainId") && apiDomain.hasOwnProperty("enterpriseName") && apiDomain.hasOwnProperty("entId") && apiDomain.hasOwnProperty("appId") && apiDomain.hasOwnProperty("request_domain") && apiDomain.hasOwnProperty("request_path") && apiDomain.hasOwnProperty("target") && apiDomain.hasOwnProperty("target_port") && apiDomain.hasOwnProperty("target_path") && apiDomain.hasOwnProperty("ssl_certificate_name") && apiDomain.hasOwnProperty("ssl_key_name") && apiDomain.enterpriseName != "" && apiDomain.entId != "" && apiDomain.app_name != "" && apiDomain.appId != "" && apiDomain.request_domain != "" && apiDomain.request_path != "" && apiDomain.target != "") {
        return true;
    }
    return false;
}

//
// Function to remove dirs and files under dir
//
function rmDir(dir) {
    var list = fs.readdirSync(dir);
    for (var i = 0; i < list.length; i++) {
        var filename = path.join(dir, list[i]);
        var stat = fs.statSync(filename);
        if (filename == "." || filename == "..") {
            // pass these files
        } else if (stat.isDirectory()) {
            // rmDir recursively
            rmDir(filename);
        } else {
            // rm filename
            fs.unlinkSync(filename);
        }
    }
    fs.rmdirSync(dir);
}


var addAPIDomains = [];

//
// Function to add channels in APIDomain File
//
function addAPIDomainFun(apiDomainData, apiDomainId, newAPIDomain, newAPIDomainLen, res, req, response) {

    var channelDataLen = apiDomainData.apiDomainConf.length;
    if (validateAPIDomain(newAPIDomain)) {

        for (var i = 0; i < channelDataLen; i++) {
            if (apiDomainData.apiDomainConf[i].request_domain != newAPIDomain.request_domain && apiDomainData.apiDomainConf[i].request_path != newAPIDomain.request_path) {
                if (i == apiDomainData.apiDomainConf.length - 1) {
                    var relayIndex = apiDomainData.apiDomainConf.length;
                    apiDomainData.apiDomainConf[relayIndex] = newAPIDomain;
                    apiDomainData.apiDomainConf[relayIndex].apiDomainId = "apidomain" + apiDomainId;
                    response.apiDomainConfig.push(newAPIDomain);
                    addAPIDomains.push(newAPIDomain);
                }
            } else {
                response.status = "Bad Request";
                response.statusCode = 400;
                response.apiDomainConfig = [];
                response.message = "APIDomain config is already present in the APIDomain. ";

                RESTHelper.sendBadRequest(req, res, response);
                return false;
            }
        }
    } else {
        response.status = "Bad request";
        response.statusCode = 400;
        response.apiDomainConfig = [];
        response.message = "APIDomain config is not in correct format. ";

        RESTHelper.sendBadRequest(req, res, response);
        return false;
    }
    if (newAPIDomainLen == 0) {

        for (var i = 0; i < addAPIDomains.length; i++) {
            var confFileName = addAPIDomains[i].enterpriseName + "-" + addAPIDomains[i].apiDomainId;
            opts = {
                name: confFileName,
                port: addAPIDomains[i].target_port,
                domain: addAPIDomains[i].request_domain,
                ssl: addAPIDomains[i].target_port == 443 ? "on" : "off",
                ssl_cert_name: confFileName + "/" + addAPIDomains[i].ssl_certificate_name,
                ssl_key_name: confFileName + "/" + addAPIDomains[i].ssl_key_name
            };
            // Add VHost in conf.d folder for every new apiDomain.
            // .conf file name will be enterpriseName-apiDomainId.
            app.nginxVhosts.addVHost(opts, function () {
            });
        }
        var idCounter = {
            "counter": apiDomainId
        };

        RedisCache.setHashVal("apiDomainIdCnt", idCounter);

        var apiDomainFilePath = path.join(global.appRoot, "/application/config/Application-Relay.json");
        fs.writeFileSync(apiDomainFilePath, JSON.stringify(apiDomainData, null, 4), "utf8");
        app.apiDomainUtil.init();
        response.status = "Success";
        response.statusCode = 200;
        response.message = "APIDomain config added successfully.";

        RESTHelper.sendOk(req, res, response);
        return true;
    }
    return true;
}

//
// Function to craete a new API Domain in Application-Relay config
//
function addAPIDomain(req, res, apiDomainData) {

    var response = {"status": "", "statusCode": "", "apiDomainConfig": [], "message": ""};
    // To add new channels

    var newAPIDomainLen;
    addAPIDomains = [];
    RedisCache.checkExists("apiDomainIdCnt", function (isExist) {
        // If apiDomainIdCnt is exist.
        if (isExist) {
            RedisCache.getHashVal("apiDomainIdCnt", function (apiDomainObj) {

                var apiDomainId = apiDomainObj.counter;
                var newAPIDomain = req.body;
                if (newAPIDomain.length == undefined) {
                    newAPIDomain = JSON.stringify(newAPIDomain);
                    newAPIDomain = "[" + newAPIDomain + "]";
                    newAPIDomain = JSON.parse(newAPIDomain);
                }
                newAPIDomainLen = newAPIDomain.length;
                for (var i = 0; i < newAPIDomain.length; i++) {
                    newAPIDomainLen--;
                    apiDomainId++;
                    var result = addAPIDomainFun(apiDomainData, apiDomainId, newAPIDomain[i], newAPIDomainLen, res, req, response);
                    if (!result) {
                        break;
                    }
                }
            });
        } else { // If apiDomainIdCnt is not exist.

            var idCounter = {
                "counter": 0
            };
            RedisCache.setHashVal("apiDomainIdCnt", idCounter);
            RedisCache.getHashVal("apiDomainIdCnt", function (apiDomainObj) {
                var apiDomainId = apiDomainObj.counter;
                var newAPIDomain = req.body;
                if (newAPIDomain.length == undefined) {
                    newAPIDomain = JSON.stringify(newAPIDomain);
                    newAPIDomain = "[" + newAPIDomain + "]";
                    newAPIDomain = JSON.parse(newAPIDomain);
                }
                newAPIDomainLen = newAPIDomain.length;
                for (var i = 0; i < newAPIDomain.length; i++) {
                    newAPIDomainLen--;
                    apiDomainId++;
                    var result = addAPIDomainFun(apiDomainData, apiDomainId, newAPIDomain[i], newAPIDomainLen, res, req, response);
                    if (!result) {
                        break;
                    }
                }
            });
        }
    });
}


//
// Function to get the APIDomain channels details on the basis of enterpriseId and apiDomainId
//
function getAPIDomain(req, res, id, apiDomainData) {

    var response = {"status": "", "statusCode": "", "apiDomainConfig": [], "message": ""};

    if (id == "entId") {
        // To display apiDomain of particular enterprise

        var entId = req.params.entId;
        for (var i = 0; i < apiDomainData.apiDomainConf.length; i++) {
            if (apiDomainData.apiDomainConf[i].entId == entId) {
                response.apiDomainConfig.push(apiDomainData.apiDomainConf[i]);
            }
        }
        if (response.apiDomainConfig.length > 0) {
            response.status = "Success";
            response.statusCode = 200;
            response.message = "APIDomain config for entId " + entId;

            RESTHelper.sendOk(req, res, response);
            return;

        } else {
            response.status = "Not Found";
            response.statusCode = 404;
            response.message = "APIDomain config for entId " + entId + "not found.";

            RESTHelper.sendNotFound(req, res, response);
            return;

        }

    } else if (id == "apiDomainId") {
        // To display apiDomain of particular apiDomainId

        var apiDomainId = req.params.apiDomainId;

        for (var i = 0; i < apiDomainData.apiDomainConf.length; i++) {
            if (apiDomainData.apiDomainConf[i].apiDomainId == apiDomainId) {
                response.apiDomainConfig.push(apiDomainData.apiDomainConf[i]);
            }
        }
        if (response.apiDomainConfig.length > 0) {
            response.status = "Success";
            response.statusCode = 200;
            response.message = "APIDomain config for apiDomainId " + apiDomainId + ".";

            RESTHelper.sendOk(req, res, response);
            return;

        } else {
            response.status = "Not Found";
            response.statusCode = 404;
            response.message = "APIDomain config for apiDomainId " + apiDomainId + " not found.";

            RESTHelper.sendNotFound(req, res, response);
            return;

        }
    }
}

//
// Function to update APIDomain by using enterpriseId and apiDomainId
//
function updateAPIDomain(req, res, id, apiDomainData) {

    var response = {"status": "", "statusCode": "", "apiDomainConfig": [], "message": ""};
    var apiDomainFilePath = path.join(global.appRoot, "/application/config/Application-Relay.json");
    if (id == "entId") {
        //Update apiDomain using entId

        var isFound = true;
        var entId = req.params.entId;
        var updateAPIDomain = req.body;
        var foundCnt = 0;
        if (updateAPIDomain.length == undefined) {
            updateAPIDomain = JSON.stringify(updateAPIDomain);
            updateAPIDomain = "[" + updateAPIDomain + "]";
            updateAPIDomain = JSON.parse(updateAPIDomain);
        }
        for (var j = 0; j < updateAPIDomain.length; j++) {

            if (validateAPIDomain(updateAPIDomain[j]) && updateAPIDomain[j].entId == entId) {
                for (var i = 0; i < apiDomainData.apiDomainConf.length; i++) {
                    if (updateAPIDomain[j].entId == apiDomainData.apiDomainConf[i].entId && updateAPIDomain[j].apiDomainId == apiDomainData.apiDomainConf[i].apiDomainId) {
                        isFound = false;
                        apiDomainData.apiDomainConf[i] = updateAPIDomain[j];
                        foundCnt++;
                    }
                }
            } else {
                response.status = "Bad Request";
                response.statusCode = 400;
                response.apiDomainConfig = [];
                response.message = "APIDomain config is not in correct format. ";

                RESTHelper.sendBadRequest(req, res, response);
                return;
            }
        }
        if (isFound || foundCnt < updateAPIDomain.length) {
            response.status = "Not found";
            response.statusCode = 404;
            response.apiDomainConfig = [];
            response.message = "APIDomain configs not found.";

            RESTHelper.sendNotFound(req, res, response);
            return;

        } else {

            for (var i = 0; i < updateAPIDomain.length; i++) {
                var confFileName = updateAPIDomain[i].enterpriseName + "-" + updateAPIDomain[i].apiDomainId;
                var opts = {
                    name: confFileName,
                    port: updateAPIDomain[i].target_port,
                    domain: updateAPIDomain[i].request_domain,
                    ssl: updateAPIDomain[i].target_port == 443 ? "on" : "off",
                    ssl_cert_name: confFileName + "/" + updateAPIDomain[i].ssl_certificate_name,
                    ssl_key_name: confFileName + "/" + updateAPIDomain[i].ssl_key_name
                };
                app.apiDomainUtil.init();
                var apiDomainObj = app.apiDomainUtil.getAPIDomainObjectByAPIDomainId(updateAPIDomain[i].apiDomainId);
                var rmConfFileName = apiDomainObj.enterpriseName + "-" + apiDomainObj.apiDomainId;

                // During updating if enterpriseName changes then rename the ssl_cert folder name.
                if (confFileName != rmConfFileName) {
                    var oldFolderName = path.join(global.appRoot, "/ssl_certs/" + rmConfFileName);
                    var newFolderName = path.join(global.appRoot, "/ssl_certs/" + confFileName);
                    fs.renameSync(oldFolderName, newFolderName)
                }

                // Remove .conf file from conf.d folder and add new updated .conf file in the same.
                app.nginxVhosts.removeVHost(rmConfFileName, function () {
                });
                app.nginxVhosts.addVHost(opts, function () {
                });

            }

            fs.writeFileSync(apiDomainFilePath, JSON.stringify(apiDomainData, null, 4), "utf8");
            app.apiDomainUtil.init();
            response.status = "Success";
            response.statusCode = 200;
            response.apiDomainConfig.push(updateAPIDomain);
            response.message = "APIDomain configs updated successfully";

            RESTHelper.sendOk(req, res, response);
            return;

        }

    } else if (id == "apiDomainId") {
        // Update apiDomain using apiDomainId

        var isFound = true;
        var apiDomainId = req.params.apiDomainId;
        var updateAPIDomain = req.body;

        if (validateAPIDomain(updateAPIDomain) && apiDomainId == updateAPIDomain.apiDomainId) {

            for (var i = 0; i < apiDomainData.apiDomainConf.length; i++) {

                if (apiDomainData.apiDomainConf[i].apiDomainId == updateAPIDomain.apiDomainId) {

                    isFound = false;
                    var rmConfFileName = apiDomainData.apiDomainConf[i].enterpriseName + "-" + apiDomainData.apiDomainConf[i].apiDomainId;
                    var confFileName = updateAPIDomain.enterpriseName + "-" + updateAPIDomain.apiDomainId;
                    apiDomainData.apiDomainConf[i] = updateAPIDomain;
                    response.apiDomainConfig.push(apiDomainData.apiDomainConf[i]);
                    fs.writeFileSync(apiDomainFilePath, JSON.stringify(apiDomainData, null, 4), "utf8");
                    app.apiDomainUtil.init();
                    var opts = {
                        name: confFileName,
                        port: updateAPIDomain.target_port,
                        domain: updateAPIDomain.request_domain,
                        ssl: updateAPIDomain.target_port == 443 ? "on" : "off",
                        ssl_cert_name: confFileName + "/" + updateAPIDomain.ssl_certificate_name,
                        ssl_key_name: confFileName + "/" + updateAPIDomain.ssl_key_name
                    };
                    // During updating if enterpriseName changes then rename the ssl_cert folder name.
                    if (confFileName != rmConfFileName) {
                        var oldFolderName = path.join(global.appRoot, "/ssl_certs/" + rmConfFileName);
                        var newFolderName = path.join(global.appRoot, "/ssl_certs/" + confFileName);
                        fs.renameSync(oldFolderName, newFolderName)
                    }
                    // Remove .conf file from conf.d folder and add new updated .conf file in the same.
                    app.nginxVhosts.removeVHost(confFileName, function () {
                    });
                    app.nginxVhosts.addVHost(opts, function () {
                    });

                    response.status = "Success";
                    response.statusCode = 200;
                    response.message = "APIDomain config updated successfully.";

                    RESTHelper.sendOk(req, res, response);
                    return true;

                }
            }
        } else {

            response.status = "Bad Request";
            response.statusCode = 400;
            response.apiDomainConfig = [];
            response.message = "APIDomain config is not in correct format. ";

            RESTHelper.sendBadRequest(req, res, response);
            return;

        }
        if (isFound) {

            response.status = "Not Found";
            response.statusCode = 404;
            response.apiDomainConfig = [];
            response.message = "APIDomain config not found.";

            RESTHelper.sendNotFound(req, res, response);
            return;

        }
    }
}

//
// Function to delete apiDomain on the basis of enterpriseId or apiDomainId
//
function deleteAPIDomain(req, res, id, apiDomainData) {
    var response = {"status": "", "statusCode": "", "message": ""};
    var apiDomainFilePath = path.join(global.appRoot, "/application/config/Application-Relay.json");
    if (id == "entId") {
        // Delete channels using of entId.
        var entId = req.params.entId;
        var isFound = true;
        for (i = apiDomainData.apiDomainConf.length - 1; i >= 0; i--) {
            if (apiDomainData.apiDomainConf[i].entId == entId) {
                isFound = false;
                var confFileName = apiDomainData.apiDomainConf[i].enterpriseName + "-" + apiDomainData.apiDomainConf[i].apiDomainId;
                var sslFolderPath = path.join(global.appRoot, "/ssl_certs/" + confFileName);

                if (fs.existsSync(sslFolderPath)) {
                    rmDir(sslFolderPath);
                }
                // Remove *.conf file from conf.d folder
                app.nginxVhosts.removeVHost(confFileName, function () {
                });
                apiDomainData.apiDomainConf.splice(i, 1);
            }
        }

        if (isFound) {
            response.status = "Not Found";
            response.statusCode = 404;
            response.message = "APIDomain config of " + entId + " is not found.";

            RESTHelper.sendNotFound(req, res, response);
            return;

        } else {
            fs.writeFileSync(apiDomainFilePath, JSON.stringify(apiDomainData, null, 4), "utf8");
            app.apiDomainUtil.init();
            response.status = "Success";
            response.statusCode = 200;
            response.message = "APIDomain config of " + entId + " is deleted successfully.";

            RESTHelper.sendOk(req, res, response);
            return;
        }

    } else if (id == "apiDomainId") {
        // Delete a apiDomain using of apiDomainId
        var apiDomainId = req.params.apiDomainId;
        var isFound = true;
        for (var i = apiDomainData.apiDomainConf.length - 1; i >= 0; i--) {
            if (apiDomainData.apiDomainConf[i].apiDomainId == apiDomainId) {
                isFound = false;
                var confFileName = apiDomainData.apiDomainConf[i].enterpriseName + "-" + apiDomainData.apiDomainConf[i].apiDomainId;
                var sslFolderPath = path.join(global.appRoot, "/ssl_certs/" + confFileName);

                fs.stat(sslFolderPath, function (err, stat) {
                    if (err == null) {
                        // Directory Exists.
                        rmDir(sslFolderPath);
                        logger.debug("Directory %s Deleted.", confFileName);
                    } else if (err.code == "ENOENT") {
                        // Directory doesn"t exists.
                    } else {
                        // Some other error.
                        logger.error("Some other error : ", err.code);
                    }
                });
                // Remove *.conf file from conf.d folder.
                app.nginxVhosts.removeVHost(confFileName, function () {
                });
                apiDomainData.apiDomainConf.splice(i, 1);

            }
        }
        if (isFound) {
            response.status = "Not Found";
            response.statusCode = 404;
            response.message = "APIDomain config of " + apiDomainId + " is not found.";

            RESTHelper.sendNotFound(req, res, response);
            return;

        } else {
            fs.writeFileSync(apiDomainFilePath, JSON.stringify(apiDomainData, null, 4), "utf8");
            app.apiDomainUtil.init();
            response.status = "Success";
            response.statusCode = 200;
            response.message = "APIDomain config of " + apiDomainId + " is deleted successfully.";

            RESTHelper.sendOk(req, res, response);
            return;
        }

    }
}
//
// Interface
//
module.exports = {
    init: init,
    addPolicyObject: addPolicyObject,
    addIdentityObject: addIdentityObject,
    getAPIDomain: getAPIDomain,
    addAPIDomain: addAPIDomain,
    updateAPIDomain: updateAPIDomain,
    deleteAPIDomain: deleteAPIDomain
};

