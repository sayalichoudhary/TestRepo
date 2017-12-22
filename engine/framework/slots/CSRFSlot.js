/**
 * Service class to execute a slot in order to check against CSRF vulnerability
 * Created by API Defender on 12-22-2015
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('CSRFSlotClass');

var Slot = require('./SlotInspector.js');

var BodyFormSlot = cls.defineClass({
    //Class name
    name : "CSRFSlot",
    //Optional super class, default is Object
    extend : Slot,
    //Constructor code
    construct : function() {
        this._slotId = "CSRF"
    },
    setAction: function(action) {
        this._action = action;
    },
    getAction: function() {
        return this._action;
    },
    //instance methods
    methods : {
        setPatterns: function(patterns) {
            this._patterns = patterns;
        },
        getPattern: function() {
            return this._patterns;
        },
        executeSlot: function(reqMethod, headers, headerName, req, securityPlugin, SecPluginLogs) {
            var action = this._action;
            this._requestMethod = reqMethod;
            this._headers = headers;
            var cookies = this._headers.cookie;
            SecPluginLogs['Inspection']++;

            // Supported request method to check CSRF token existence
            var supportedMethods = ["put", "post", "delete"];
            var slotResult = "allow";

            if(null == this._patterns) {
                throw new Error('Add patterns to test first');
            }else if(this._requestMethod != null) {

                if(supportedMethods.indexOf(this._requestMethod.toLowerCase()) != -1) {
                    //logger.debug("Supported request method for CSRF check: ", this._requestMethod);
                    var csrfRegex = new RegExp(headerName, "g");
                    if(undefined != cookies && cookies.match(this._patterns) != null) {
                        this._headers = JSON.stringify(this._headers);
                        var doubleQuote = new RegExp('"','g');
                        this._headers = this._headers.replace(doubleQuote, "'");
                        if(undefined != headerName && this._headers.match(csrfRegex) == null) {
                            slotResult = action;
                        } else if(undefined == headerName) {
                            slotResult = action;
                        }
                    }
                }
            }
            var serverUrl = req.API;
            // For now just return true
            // Response error config

            if(slotResult == "block") {
                SecPluginLogs['Blocked']++;
                SecPluginLogs.BlockedSecurityPlugins.push(securityPlugin);
            } else if(slotResult == "flag") {
                SecPluginLogs['Flagged']++;
                SecPluginLogs.FlaggedSecurityPlugins.push(securityPlugin);
            }
            return slotResult;
        }
    },
    //instance variables
    variables: {
        _patterns : null,
        _requestMethod : null,
        _headers: null,
        _regex: "(?:(j?sessionid|(php)?sessid|zang_sessionPassphrase|(asp|jserv|jw)?session[-_]?(id)?|cf(id|token)|sid).*?=([^\s].*?)\;\s?)",
        _action : null
    }
    //Class level variables or methods
    //statics : { }
});

module.exports = BodyFormSlot;