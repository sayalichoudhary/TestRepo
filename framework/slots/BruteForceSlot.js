/**
 * IpBlackList Slot Class
 * Service class to execute a slot in order to check against Brute force vulnerability
 * Created by API Defender on 29/12/2015
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var crypto = require('crypto');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('BruteForceSlotClass');

var Slot = require('./SlotInspector.js');

var BruteForceSlot = cls.defineClass({
    //Class name
    name : "BruteForceSlot",
    //Optional super class, default is Object
    extend : Slot,
    //Constructor code
    construct : function() {
        this._slotId = "BruteForce";
        RedisCache = global.app.redisCache;
    },
    //instance methods
    methods : {
        setPatterns: function(patterns) {
            this._patterns = patterns;
        },
        getPattern: function() {
            return this._patterns;
        },
        setAction: function(action) {
            this._action = action;
        },
        getAction: function() {
            return this._action;
        },
        executeSlot: function(req, secPluginObj, headerNames, securityPlugin, SecPluginLogs, callback) {
            //var slotResult = true;
            var slotResult = "allow";
            var action = this._action;
            var serverUrl = req.API;
            var ip = req.headers['x-forwarded-for'];
            var headerVals="", signatureKey;
            SecPluginLogs['Inspection']++;

            if(headerNames != "" ) {
                var headers = req.headers;
                var names = headerNames.split("|");
                for(var index in names){
                    headerVals = headerVals + headers[names[index]];
                }

                // Calculate the checksum of the header values we get in above step
                var checksumVal = checksum(headerVals);
                signatureKey = req.apiDomainConfObj.entId + "-" + req.apiDomainConfObj.appId + "-" + checksumVal;

            } else {
                signatureKey = req.apiDomainConfObj.entId + "-" + req.apiDomainConfObj.appId;
            }
            var reqUrl = req.headers['x-forwarded-proto'] + "://" + req.headers.host + req.url;
            var app = req.apiDomainConfObj.entId + "_" + req.apiDomainConfObj.appId;
            callback(slotResult);
            RedisCache.checkExists(signatureKey, function (isExist) {
                if(isExist) {

                    RedisCache.getHashVal(signatureKey, function (object) {
                        var count = parseInt(object.count);
                        count++;

                        var prevDate = new Date(object.startTime);
                        prevDate.setMilliseconds(parseInt(secPluginObj.duration));
                        var currentDate = new Date();
                        // To check whether current time is below threshold Time
                        if(currentDate.getTime() <= prevDate.getTime()) {
                            if (parseInt(secPluginObj.count) * 2 <= count) {
                                logger.trace("Block the request, IP = %s to %s URL of %s application and Req count reaches to its threshold =",ip, reqUrl, app, count);
                                var values = {
                                    'startTime': object.startTime,
                                    'count': count
                                };

                                RedisCache.setHashVal(signatureKey, values);
                                SecPluginLogs['Blocked']++;
                                SecPluginLogs.BlockedSecurityPlugins.push(securityPlugin);
                                slotResult = action;
                                callback(slotResult);
                                return;

                            } else {
                                logger.trace("Request from IP = %s to %s URL of %s application and Req count = ", ip, reqUrl, app, count);

                                var sTime = object.startTime
                                var values = {
                                    'startTime': sTime,
                                    'count': count
                                };

                                RedisCache.setHashVal(signatureKey, values);
                                //return values;
                                callback(slotResult);
                                return;
                            }
                        } else {
                            var date = new Date();
                            var count = 1;
                            logger.trace("Request from IP = %s to %s URL of %s application and Req count =", ip, reqUrl, app, count);
                            var values = {
                                'startTime': date,
                                'count': count
                            };

                            RedisCache.setHashVal(signatureKey, values);
                            callback(slotResult);
                            return;
                        }
                    });
                } else {
                    var date = new Date();
                    var burstCnt = 0;
                    var count = 1;
                    var values = {
                        'startTime' : date,
                        'count' : count
                    };

                    RedisCache.setHashVal(signatureKey, values);
                    callback(slotResult);
                    return;
                }
            });
        }
    },
    //instance variables
    variables: {

    }
    //Class level variables or methods
    //statics : {
    //
    //}
});

// Function to calculate console.log of given string with algorithm and encoding type
function checksum(string, algorithm, encoding) {
    // Returns checksum of the given string with 'SHA-1' algo in 'Hex' format
    return crypto
        .createHash(algorithm || 'sha1')
        .update(string, 'utf8')
        .digest(encoding || 'hex');
}


module.exports = BruteForceSlot;