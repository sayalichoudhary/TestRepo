/**
 * Loads Application-Relay config into memory, creates target endpoint URL and forwards request to target host
 * Created by API Defender on 30/10/2015
 * @version 1.0
 */

// Dependencies
var log4js = require("log4js");
var Constants = require("../utils/Constants");

// Logger
var logger = log4js.getLogger("SecurityPolicyLoaderService");

// Variable declaration
// Object map reference which holds enterprise wise slot object array
var refObjectMap = {};
var keysList;

// Slot classes reference needed to create slot object
var URLSlot = app.slots.getSlot(Constants.SlotNames.URL);
var BodyFormSlot = app.slots.getSlot(Constants.SlotNames.Body);
var HeaderSlot = app.slots.getSlot(Constants.SlotNames.Header);

// Services
var ManagementAPIService;
var RedisCache = app.redisCache;

//
// Constructor for service, initialize the policy object
//
function init() {
    ManagementAPIService = global.app.services.getService(Constants.Services.NorthBound);

    // Initialize slot objects from cache/policy file
    logger.debug("First time policy object initialization started");

    RedisCache.checkExists(Constants.cacheFlag, function (result) {
        if (result != 1) {
            logger.debug("Cache not loaded with policy data");
            //return;
        }
        RedisCache.getVal(Constants.cacheFlag, function (value) {
            if (value != "true") {
                logger.debug("Cache not loaded with policy data");
                //return;
            }
            // Get enterprise application policies
            RedisCache.getAllKeys("ent[^a-z][^a-z][^a-z]_*", function (list) {
                logger.debug("List of Ent_App policies : ", list);
                keysList = list;
                for (var index in keysList) {
                    createObjectsFromCache(keysList[index]);
                }

            });
        });
    });
}
//
// Function to update the policy object in cache
//
function refreshObjects() {
    RedisCache.getAllKeys("ent[^a-z][^a-z][^a-z]_app[^a-z][^a-z][^a-z]", function (list) {
        logger.debug("Refresh List of Ent_App policies  : ", list);

        keysList = list;
        for (var index in keysList) {
            createObjectsFromCache(keysList[index]);
        }
    });
    logger.debug("Policy changed, policy object refresh requested");
}

//
// Function to retrive security plugins from cache
//
function getSecurityPluginObjectSL() {
    RedisCache.getHashVal(keysList, function (object) {
        if (object != undefined) {
            refObjectMap[keysList] = object;
        }
    });
}

//
// Function to retrieve security plugins for given enterprise Id
//
function getAllSecurityPluginObjectSL(entAppId) {
    // Inspection Slots
    logger.trace("Policy for : ", entAppId);
    return refObjectMap[entAppId];
}

//
// Function to polpulate ref objetc map with the cache values
//
function createObjectsFromCache(key) {
    RedisCache.getHashVal(key, function (object) {
        if (object != undefined) {
            refObjectMap[key] = object;
        }
    });
}

//
// Function to retrieve identity keys from cache
//
function getIdentityKey(key, callback) {
    var idKey, entID_appID;
    RedisCache.getAllKeys(key + ".app[^a-z][^a-z][^a-z]", function (list) {
        idKey = list;
        logger.info(list)
        RedisCache.getHashVal(idKey, function (object) {
            if (object != undefined) {
                entID_appID = object.enterpriseId + "_" + object.applicationId;
                callback(entID_appID);
            }
        })
    });
}

//
// Interface
//
module.exports = {
    init: init,
    refreshObjects: refreshObjects,
    getSecurityPluginObjectSL: getSecurityPluginObjectSL,
    getAllSecurityPluginObjectSL: getAllSecurityPluginObjectSL,
    getIdentityKey: getIdentityKey
};