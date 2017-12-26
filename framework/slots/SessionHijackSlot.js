/**
 * Retrieves session id cookie present in request cookies, check against the saved checksum value if matches with saved session id
 * Created by API Defender on 03/30/16
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var crypto = require('crypto');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('SessionHijackSlotClass');

var Slot = require('./SlotInspector.js');

var BodyFormSlot = cls.defineClass({
    //Class name
    name : "SessionHijackSlot",
    //Optional super class, default is Object
    extend : Slot,
    //Constructor code
    construct : function() {
        this._slotId = "SessionHijack"
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
        executeSlot: function(headers, headerNames, req, securityPlugin, SecPluginLogs, callback) {
            var RedisCache = global.app.redisCache;
            var entId = req.apiDomainConfObj.entId;
            var appId = req.apiDomainConfObj.appId;
            this._headers = headers;
            var slotResult = "allow";
            var action = this._action;
            var names = headerNames.split("|");
            var cookies = this._headers.cookie;
            var headerVals;
            SecPluginLogs['Inspection']++;

            if(null == this._patterns) {
                throw new Error('Add patterns to test first');
            } else if(headerNames != null) { // Check if the headers are not null

                // Get header values provided in headerNames(separated by '|')
                for(var index in names){
                    headerVals += this._headers[names[index]];
                }

                // Calculate the checksum of the header values we get in above step
                var checksumVal = checksum(headerVals);
                // Check if session id is present in cookies, if yes then collect its value
                if(undefined != cookies && cookies.match(this._patterns) != null) {

                    var sessionValue = cookies.match(this._patterns)[0].split("=")[1];
                    var redisKey = entId + "-" + appId + "-" + sessionValue;
                    // Check if the key exist in redis
                    RedisCache.checkExists(redisKey, function(isExist) {

                        // If key exist in redis then check the current checksum value with saved one
                        if(isExist) {
                            RedisCache.getVal(redisKey, function(result){
                                // If the checksum mismatched with saved one then its an attack
                                if(result != checksumVal) {
                                    slotResult = action;
                                    SecPluginLogs['Blocked']++;
                                    SecPluginLogs.BlockedSecurityPlugins.push(securityPlugin);
                                }
                                callback(slotResult);
                                //return slotResult;
                            });
                        } else { // Save the key-value(checksum) in redis
                            RedisCache.setVal(redisKey, checksumVal);
                            //return slotResult;
                            callback(slotResult);
                        }
                    });
                }
            }

            //return slotResult;
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


// Function to calculate checksum of given string with algorithm and encoding type
function checksum(string, algorithm, encoding) {
    // Returns checksum of the given string with 'SHA-1' algo in 'Hex' format
    return crypto
        .createHash(algorithm || 'sha1')
        .update(string, 'utf8')
        .digest(encoding || 'hex');
}

module.exports = BodyFormSlot;