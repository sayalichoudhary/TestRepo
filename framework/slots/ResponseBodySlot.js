/**
 * Service class to execute a slot in order to match response body with slot patterns and set result sccordingly
 * Created by API Defender on 12-22-2015
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('ResponseBodySlotClass');

var Slot = require('./SlotInspector.js');

// Bodyform slot class
var BodyFormSlot = cls.defineClass({
    //Class name
    name : "ResponseBodySlot",
    //Optional super class, default is Object
    extend : Slot,
    //Constructor code
    construct : function() {
        this._slotId = "ResponseBody"
    },
    //instance methods
    methods : {
        setPatterns: function(patterns) {
            this._patterns = patterns;
        },
        getPattern: function() {
            return this._paterns;
        },
        setAction: function(action) {
            this._action = action;
        },
        getAction: function() {
            return this._action;
        },
        executeSlot: function(type, data, exp, res, securityPlugin, SecPluginLogs) {
            this._responseData = data;
            var slotResult = "allow";
            var action = this._action;
            if(null == this._patterns) {
                throw new Error('Add patterns to test first');
            }else if(this._responseData != null) {

                if(null != type && type == "payload_size") {
                    this._patterns = new RegExp(exp.join('|'), 'g');
                    if(this._responseData.match(this._patterns).length > 1) {
                        slotResult = action;
                    }
                } else {
                    if (this._responseData.match(this._patterns) != null) {
                        slotResult = action;
                    }
                }
            }
            var serverUrl = res.API;
            // For now just return true
            // Response error config
                SecPluginLogs['Inspection']++;
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
        _responseData : null,
        _action : null
    }
    //Class level variables or methods
    //statics : { }
});

module.exports = BodyFormSlot;