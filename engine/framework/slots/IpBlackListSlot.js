/**
 * IpBlackList Slot Class
 * Created by API Defender on 18/12/2015
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('IpBlackListSlotClass');

var Slot = require('./SlotInspector.js');

var IpBlackListSlot = cls.defineClass({
    //Class name
    name : "IpBlackListSlot",
    //Optional super class, default is Object
    extend : Slot,
    //Constructor code
    construct : function() {
        this._slotId = "IpBlackList";
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
        executeSlot: function(countryCode, req, securityPlugin, SecPluginLogs) {
            this._countryCode = countryCode;
            var slotResult = "allow";
            var action = this._action;
            SecPluginLogs['Inspection']++;
            if(null == this._patterns) {
                throw new Error('Add patterns to test first');
            }else if(this._countryCode != null) {
                if(this._countryCode.match(this._patterns) != null) {
                    slotResult = action;
                }
            }
            // For now just return true
            var serverUrl = req.API;
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
        _countryCode : null,
        _action : null
    }
    //Class level variables or methods
    //statics : { }
});

module.exports = IpBlackListSlot;