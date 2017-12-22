/**
 * Service class to execute a slot in order to match response header with slot patterns and set result sccordingly
 * Created by API Defender on 12-22-2015
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('ResponseHeaderSlotClass');

var Slot = require('./SlotInspector.js');

var BodyFormSlot = cls.defineClass({
    //Class name
    name : "ResponseHeaderSlot",
    //Optional super class, default is Object
    extend : Slot,
    //Constructor code
    construct : function() {
        this._slotId = "ResponseHeader"
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
        executeSlot: function(res, headerName, securityPlugin, SecPluginLogs) {
            this._statusCode = res.statusCode + "";
            this._responseHeader = res.headers;
            var slotResult = "allow";
            var action = this._action;

            if( securityPlugin != "WeakServerSessionToken") {
                if (null == this._patterns) {
                    throw new Error('Add patterns to test first');
                } else if (this._statusCode != null) {
                    if (this._statusCode.match(this._patterns) != null) {
                        slotResult = action;
                    }
                }
                if (null != this._responseHeader) {
                    if (undefined != headerName) {
                        var headerValue = this._responseHeader[headerName.toLowerCase()] + "";
                        if(securityPlugin == "UnvalidatedRedirectsForwards" && headerName == "location" && "undefined" != headerValue ) {
                            slotResult = "block";
                        }
                        if ("undefined" != headerValue && headerValue.match(this._patterns) != null) {
                            slotResult = action;
                        }
                    } else {
                        for (var key in this._responseHeader) {
                            if (this._responseHeader.hasOwnProperty(key)) {
                                var headerVal = this._responseHeader[key] + "";
                                if (undefined != headerVal && headerVal.match(this._patterns) != null) {
                                    slotResult = action;
                                }
                            }
                        }
                    }
                }
            } else {
                if(null == this._patterns) {
                    throw new Error('Add patterns to test first');
                } else if (headerName != null) { // Check if the headers are not null
                    var cookies = res.headers[headerName] + "";
                    if (cookies != "undefined" && cookies.match(this._patterns) == null) {
                        slotResult = action;
                    }
                }
            }
            // Response error config
            SecPluginLogs['Inspection']++;
            if(slotResult == "block") {
                SecPluginLogs['Blocked']++;
                SecPluginLogs.BlockedSecurityPlugins.push(securityPlugin);
            } else if(slotResult == "flag" ){
                SecPluginLogs['Flagged']++;
                SecPluginLogs.FlaggedSecurityPlugins.push(securityPlugin);
            }
            return slotResult;
        }
    },
    //instance variables
    variables: {
        _patterns : null,
        _statusCode: null,
        _responseHeader : null,
        _cookies : null,
        _action : null
    }
    //Class level variables or methods
    //statics : { }
});

module.exports = BodyFormSlot;