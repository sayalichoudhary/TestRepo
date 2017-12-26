/**
 * Service class to execute a slot in order to match request headers with slot patterns and set result sccordingly
 * Created by API Defender on 16/10/2015
 * @version 1.0
 */
// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

//logger
var logger = log4js.getLogger('HeaderSlotClass');

var Slot = require('./SlotInspector.js');

var HeaderSlot = cls.defineClass({
    //class name
    name : "HeaderSlot",
    // optional super class, default is Object
    extend : Slot,
    // Constructor code
    construct : function () {
        this._slotId = "Header";
    },
    // Instance method
    methods : {
        setPatterns: function(patterns) {
            this._patterns = patterns;
        },
        setAuthCheck: function(isAuthCheck) {
            this._isAuthCheck = isAuthCheck;
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
        executeSlot: function(headers, headerName, req, securityPlugin, SecPluginLogs) {
            var action = this._action;
            this._headers = headers;
            this._headerName = headerName;
            var slotResult = "allow";

            SecPluginLogs['Inspection']++;
            if(this._isAuthCheck) {

                this._authorization =this._headers[this._headerName]
                if(this._authorization != undefined) {
                    if(this._authorization.match(this._patterns) == null) {
                        slotResult = action;
                    }
                }

            } else {
                this._host = this._headers['host'];
                this._referer = ""+this._headers['referer'];
                this._userAgent = this._headers['user-agent'];
                this._cookies = this._headers.cookie;

                var cookiesArr;

                if(this._cookies != undefined){
                    cookiesArr = this._cookies.split(";");
                }

                if(null == this._patterns) {
                    throw new Error('Add patterns to test first');
                }else {
                    if(this._host != undefined && this._host.match(this._patterns) != null) {
                        slotResult = action;
                    }else if(this._userAgent != undefined && this._userAgent.match(this._patterns) != null) {
                        slotResult = action;
                    }else if(this._referer != undefined && this._referer.match(this._patterns) != null) {
                        slotResult = action;
                    }else if(this._cookies != undefined && cookiesArr != undefined){
                        for(var cookie in cookiesArr){
                            if(cookiesArr[cookie].match(this._patterns) != null) {
                                slotResult = action;
                            }
                        }
                    }
                }
            }
            var serverUrl = req.API;
            if(slotResult == "block") {
                SecPluginLogs['Blocked']++;
                SecPluginLogs.BlockedSecurityPlugins.push(securityPlugin);
            } else if(slotResult == "flag"){
                SecPluginLogs['Flagged']++;
                SecPluginLogs.FlaggedSecurityPlugins.push(securityPlugin);
            }
            return slotResult;
        }
    },
    // Instance variable
    variables : {
        _patterns : null,
        _headers: null,
        _host : null,
        _referer : null,
        _userAgent : null,
        _cookies: null,
        _isAuthCheck: false,
        _headerName : null,
        _authorization: null,
        _action : null
    }
    //Class level variables or methods
    //statics : { }
});
module.exports = HeaderSlot;

