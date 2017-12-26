/**
 * Service class to execute a slot in order to match request body with slot patterns and set result sccordingly
 * Created by API Defender on 03-09-2015
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('BodyFormSlotClass');

// Service Dependencies
var Slot = require('./SlotInspector.js');

var BodyFormSlot = cls.defineClass({
	//Class name
	name : "BodyFormSlot",
	//Optional super class, default is Object
	extend : Slot,
	//Constructor code
	construct : function() {
		this._slotId = "BodyForm";
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
		executeSlot: function(formData, req, securityPlugin, SecPluginLogs) {
            this._formData = formData;
            var action = this._action;
			var slotResult = "allow";
            if(null == this._patterns) {
				throw new Error('Add patterns to test first');
			}else if(this._formData != null) {
                if(this._formData.match(this._patterns) != null) {
                    slotResult = action;
                }
            }
            var serverUrl = req.API;

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
		_formData : null,
        _action : null
	}
	//Class level variables or methods
	//statics : { }
});

module.exports = BodyFormSlot;