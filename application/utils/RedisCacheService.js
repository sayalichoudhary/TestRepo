/**
 * Service class to interacts with Redis server
 * Created by API Defender on 28/10/2015
 * @version 1.0
 */

// Dependencies
var RedisCache = require("redis");
var log4js = require('log4js');
var config = require('config');
var stripJsonComments = require('strip-json-comments');
//var jsonify = require('redis-jsonify');
// Logger
var logger = log4js.getLogger('RedisCacheService');

//
// Cache client for Redis cache
//
var cacheClient;

//
// Constructor for service, Initiate cache client
//
function init() {
    try {

        logger.debug("Initializing...");
        cacheClient = RedisCache.createClient(config.get("redisConf.port"), config.get("redisConf.host"));
        cacheClient.auth(config.get("redisConf.passkey"), function (res) {
            logger.debug("Redis auth validating...");
        });
        logger.debug("Connecting to server...");
    } catch (err) {
        logger.error(err);
    }

    // Redis event listeners
    cacheClient.on("connect", function () {
        logger.debug("Done initializing, connected to server.");
    });
    cacheClient.on("", function (err) {
        logger.error(err);
    });
}

//
// Function to check if the given key is already exist in the cache
//
function checkExists(key, callback) {
    try {
        cacheClient.exists(key, function (err, result) {
            callback(result);
        });
    } catch (err) {
        logger.error(err);
        callback(-1);
    }
}

//
// Function to set the key and value in cache
//
function setHashVal(key, slotVal) {
    try {
        cacheClient.hmset(key, slotVal, function (err, object) {
            if (err) return err;
            return true;
        });
    } catch (err) {
        logger.error(err);
        return false;
    }
}

//
// Function to get cache value for a key
//
function getHashVal(key, callback) {
    try {
        cacheClient.hgetall(key, function (err, object) {
            if (err)
                logger.error(err);
            callback(object);
        });
    } catch (err) {
        logger.error(err);
        callback(-1);
    }
}

//
// Function to delete key-value from cache
//
function delHash(key) {
    try {
        cacheClient.del(key, function (reply) {
            if (reply)
                logger.debug(reply);
        });
        return true;
    } catch (err) {
        logger.error(err);
        return false;
    }
}

//
// Function to get all keys from cache matching to given key pattern
//
function getAllKeys(pattern, callback) {
    try {
        cacheClient.keys(pattern, function (err, list) {
            if (err)
                logger.error("Error while fetching keys").error(err);

            callback(list);
        });
    } catch (err) {
        logger.error(err);
        return callback(null);
    }
}

//
// Function to set the key and value in cache
//
function setVal(key, value) {
    try {
        cacheClient.set(key, value, function (err) {
            if (err) return err;
            return true;
        });
    } catch (err) {
        logger.error(err);
        return false;
    }

}

//
// Function to get the cache value for given key
//
function getVal(key, callback) {
    try {
        cacheClient.get(key, function (err, object) {
            if (err)
                logger.error(err);
            callback(object);
        });
    } catch (err) {
        logger.error(err);
        callback(-1);
    }
}

//
// Interface
//
module.exports = {
    init: init,
    checkExists: checkExists,
    setHashVal: setHashVal,
    getHashVal: getHashVal,
    delHash: delHash,
    getAllKeys: getAllKeys,
    setVal: setVal,
    getVal: getVal
};