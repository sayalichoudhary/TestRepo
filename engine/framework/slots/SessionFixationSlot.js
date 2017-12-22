/**
 * Retrieves session id cookie present in request cookies and check against the cache session value
 * Created by API Defender on 01-06-2016
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('SessionFixationSlotClass');

var Slot = require('./SlotInspector.js');

var BodyFormSlot = cls.defineClass({
    //Class name
    name : "SessionFixationSlot",
    //Optional super class, default is Object
    extend : Slot,
    //Constructor code
    construct : function() {
        this._slotId = "SessionFixation"
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
        executeSlot: function(source, headers, req, securityPlugin, SecPluginLogs, callback) {
            var RedisCache = global.app.redisCache;
            this._headers = headers;
            var slotResult = "allow";
            var action = this._action;
            var cookies;
            var headerVals;

            var serverUrl = req.API;
            SecPluginLogs['Inspection']++;
            if(null == this._patterns) {
                throw new Error('Add patterns to test first');
            } else if(source == "REQ") { // Session fixation validation in request
                var redisKey = req.apiDomainConfObj.entId + "-" + req.apiDomainConfObj.appId + "-AnonymousSessionIds";
                // Get cookies returned by client from request
                cookies = this._headers.cookie;

                // Check if there is any session id cookie present in cookies, if yes then extract it
                if(undefined != cookies && cookies.match(this._patterns) != null) {
                    var sessionValue = cookies.match(this._patterns)[0].split("=")[1];
                    // Check if there are any session ids saved for that particular app in enterprise
                    RedisCache.checkExists(redisKey, function(isExist) {

                        // If yes, match the current request session id with saved session ids
                        if(isExist) {
                            RedisCache.getHashVal(redisKey, function(result){
                                var ids = [];
                                ids = result.sessionIds.split(",");

                                for(var index in ids) {
                                    var sessionId = ids[index];
                                    if(sessionValue == sessionId) { // If any saved session id matches with current session id then its attack
                                        slotResult = action;
                                    }
                                }
                                if(slotResult == "block") {
                                    SecPluginLogs['Blocked']++;
                                    SecPluginLogs.BlockedSecurityPlugins.push(securityPlugin);
                                } else if(slotResult == "flag") {
                                    SecPluginLogs['Flagged']++;
                                    SecPluginLogs.FlaggedSecurityPlugins.push(securityPlugin);
                                }
                                callback(slotResult);
                            });
                        } else { // If no saved session ids in redis pass the test
                            callback(slotResult);
                        }
                    });
                }
            } else if(source == "RES") { // Session fixation validation in response
                // Get cookies set by server from response
                var redisKey = req.apiDomainConfObj.entId + "-" + req.apiDomainConfObj.appId + "-AnonymousSessionIds";
                cookies = this._headers['set-cookie'] + "";
                // Check if there is any session id cookie present in cookies, if yes then extract it
                if(undefined != cookies && cookies.match(this._patterns) != null) {
                    var sessionValue = cookies.match(this._patterns)[0].split("=")[1];

                    // Check if there are any session ids saved for that particular app in enterprise
                    RedisCache.checkExists(redisKey, function(isExist) {

                        // If yes, add the current session id value in previous list
                        if(isExist) {
                            RedisCache.getHashVal(redisKey, function(result){
                                var val = [];
                                val.push(result.sessionIds);
                                val.push(sessionValue);
                                result = {"sessionIds": val};
                                RedisCache.setHashVal(redisKey, result);
                            });
                        } else { // If no, create new entry in redis with key and current session id
                            var val = [];
                            val.push(sessionValue);
                            var redisValue = {"sessionIds": val};
                            RedisCache.setHashVal(redisKey, redisValue);
                        }
                    });
                }
                // Processing will continue, return result immediately as nothing to validate in response
                // just add session id value in redis
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

module.exports = BodyFormSlot;