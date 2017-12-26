/**
 * Service class to execute a slot in order to match request URL with slot patterns and set result sccordingly
 * Created by API Defender on 01-07-2015
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('URLSlotClass');

var Slot = require('./SlotInspector.js');

var URLSlot = cls.defineClass({
	//Class name
	name : "URLSlot",
	//Optional super class, default is Object
	extend : Slot,
	//Constructor code
	construct : function() {
		this._slotId = "URL"
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
		executeSlot: function(path, domain, query, req, securityPlugin, SecPluginLogs) {
            this._path = path;
            this._domain = domain;
            this._query = query;
			var slotResult = "allow";
            var action = this._action;
            SecPluginLogs['Inspection']++;

			if(null == this._patterns) {
				throw new Error('Add patterns to test first');
			} else {

				if(this._path != undefined && this._path.match(this._patterns) != null) {
                    slotResult = action;
				}else if(this._domain != undefined && this._domain.match(this._patterns) != null) {
                    slotResult = action;
                }else if(this._query != null) {
                    if (this._query != undefined && this._query.match(this._patterns) != null) {
                        slotResult = action;
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
        _domain : null,
        _path : null,
        _query : null,
        _action : null
	}
	//Class level variables or methods
	//statics : { }
});

module.exports = URLSlot;