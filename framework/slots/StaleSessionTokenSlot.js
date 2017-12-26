/**
 * Retrieves session id cookie present in request cookies and check against the cache session value
 * Created by API Defender on 31/05/2016
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('StaleSessionTokenSlotClass');

var Slot = require('./SlotInspector.js');

var StaleSessionTokenSlot = cls.defineClass({
    //Class name
    name : "StaleSessionTokenSlot",
    //Optional super class, default is Object
    extend : Slot,
    //Constructor code
    construct : function() {
        this._slotId = "StaleSessionToken"
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
        executeSlot: function(source, headers, headerName, secPluginObj, req, securityPlugin, SecPluginLogs, callback) {

            var RedisCache = global.app.redisCache;
            var action = this._action;
            var entId = req.apiDomainConfObj.entId;
            var appId = req.apiDomainConfObj.appId;
            this._headers = headers;
            var slotResult = "allow";
            var cookies = this._headers[headerName] + "";
            var sessionKey = { "expireDuration" : "" };

            SecPluginLogs['Inspection']++;
            if(null == this._patterns) {
                throw new Error('Add patterns to test first');
            } else if(source == "REQ") {
                if (headerName != "") { // Check if the headers are not null
                    // Check if session id is present in cookies, if yes then collect its value
                    if ("undefined" != cookies && cookies.match(this._patterns) != null) {
                            var sessionValue = cookies.match(this._patterns)[0].split("=")[1];
                            sessionValue = sessionValue.substring(0, sessionValue.indexOf("; ") - 1);
                        
                        var redisKey = entId + "-" + appId + "-" + sessionValue;
                        // Check if the key exist in redis
                        RedisCache.checkExists(redisKey, function (isExist) {

                            // If key exist in redis then check the current value with saved one
                            if (isExist) {
                                RedisCache.getHashVal(redisKey, function (result) {
                                    var prevDate = new Date(result.startSessionTime);
                                    prevDate.setMilliseconds(parseInt(secPluginObj.duration));
                                    var currentDate = new Date();
                                    if (currentDate.getTime() >= prevDate.getTime()) {
                                        slotResult = action;
                                    }

                                    if (slotResult == "block") {
                                        SecPluginLogs['Blocked']++;
                                        SecPluginLogs.BlockedSecurityPlugins.push(securityPlugin);
                                    } else if(slotResult == "flag") {
                                        SecPluginLogs['Flagged']++;
                                        SecPluginLogs.FlaggedSecurityPlugins.push(securityPlugin);
                                    }
                                    //return slotResult;
                                    callback(slotResult);
                                });
                            } else { // Save the key-value in redis

                                sessionKey = { "startSessionTime": new Date()};
                                RedisCache.setHashVal(redisKey, sessionKey);
                                callback(slotResult);
                            }
                        });
                    }
                }
            } else if(source == "RES") {
                var cookies = this._headers['set-cookie'] + "";
                // Check if there is any session id cookie present in cookies, if yes then extract it
                if(undefined != cookies && cookies.match(this._patterns) != null) {
                    var sessionValue = cookies.match(this._patterns)[0].split("=")[1];
                    sessionValue = sessionValue.substring(0, sessionValue.indexOf("; ") - 1);
                    var redisKey = entId + "-" + appId + "-" + sessionValue;
                    // Check if there are any session ids saved for that particular app in enterprise
                    RedisCache.checkExists(redisKey, function (isExist) {

                        // If key exist in redis then check session is expired or not
                        if (isExist) {
                            RedisCache.getHashVal(redisKey, function (result) {
                                var prevDate = new Date(result.startSessionTime);
                                prevDate.setMilliseconds(parseInt(secPluginObj.duration));
                                var currentDate = new Date();
                                if (currentDate.getTime() >= prevDate.getTime()) {
                                    slotResult = action;
                                }

                                if (slotResult == "block") {
                                    SecPluginLogs['Blocked']++;
                                    SecPluginLogs.BlockedSecurityPlugins.push(securityPlugin);
                                } else if(slotResult == "flag") {
                                    SecPluginLogs['Flagged']++;
                                    SecPluginLogs.FlaggedSecurityPlugins.push(securityPlugin);
                                }
                                //return slotResult;
                                callback(slotResult);
                            });
                        } else { // Save the key-value in redis
                            sessionKey = { "startSessionTime": new Date()};
                            RedisCache.setHashVal(redisKey, sessionKey);
                            //return slotResult;
                            callback(slotResult);
                        }
                    });
                }
            }
        }
    },
    //instance variables
    variables: {
        _patterns : null,
        _requestMethod : null,
        _headers: null,
        _action : null
    }
    //Class level variables or methods
    //statics : { }
});

module.exports = StaleSessionTokenSlot;