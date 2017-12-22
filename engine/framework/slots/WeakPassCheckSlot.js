/**
 * Service class to execute a slot in order to match password value with slot patterns and set result sccordingly
 * Created by API Defender on 12-29-2015
 * @version 1.0
 */

// Dependencies
var cls = require("simple-cls");
var log4js = require('log4js');
var ResErrConf = require('../../application/config/ErrorResponse/config');

// Logger
var logger = log4js.getLogger('WeakPassSlotClass');

var Slot = require('./SlotInspector.js');

var BodyFormSlot = cls.defineClass({
    //Class name
    name : "WeakPassSlot",
    //Optional super class, default is Object
    extend : Slot,
    //Constructor code
    construct : function() {
        this._slotId = "WeakPassword"
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
        executeSlot: function(passFieldName, formData, req, securityPlugin) {
            var lengthRegex = "" + this._patterns;

            var weakPassReg = new RegExp(this._weakPassRegex + lengthRegex.split("/")[1].split("/i")[0] + "$", 'g');
            this._formData = formData;
            var slotResult = true;
            var passParamValue = null;

            // Extract password field value either from body or from query string.
            if(passFieldName.indexOf("BODY") != -1) {
                var passField = passFieldName.split("_")[1];
                var formParams = formData.split("&");
                for(var index in formParams) {
                    if(formParams[index].indexOf(passField) != -1) {
                        var passParam = formParams[index];
                        passParamValue = passParam.split("=")[1];

                    }
                }
            } else if(passFieldName.indexOf("QUERY") != -1) {
                var passField = passFieldName.split("_")[1];
                passParamValue = req.query[passField];

            }

            if(null == this._patterns) {
                throw new Error('Add patterns to test first');
            }else if(passParamValue != null) {

                // Check if the password value is greater than or equal to defined length
                if(passParamValue.match(this._patterns) == null) {
                    slotResult = false;
                } else {

                    // Check if the password meet all below conditions:
                    // 1. at least one uppercase letter
                    // 2. at least one lowercase letter
                    // 3. at least one digit
                    // 4. at least one special character
                    // If it misses anyone of the above then the password is weak.
                    if(passParamValue.match(weakPassReg) == null) {
                        slotResult = false;
                    }
                }
            } else {
                // Return false if we don't find password field anywhere either in body or in query string
                slotResult = false;
            }
            var serverUrl = req.API;
            // For now just return true
            // Response error config
            SecurityPluginsLog['Inspection']++;
            if(!slotResult) {
                SecurityPluginsLog[securityPlugin]++;
                SecurityPluginsLog['Blocked']++;
                //logger.debug("SecurityPlugin=%s, SecPluginAPI=%s, SecPluginMethod=%s, SecPluginAPIKey=%s, SecPluginEnterpriseName=%s, SecPluginAppName=%s, SecPluginEnterpriseId=%s, SecPluginApplicationId=%s, SecPluginStatusCode=%s, StatusValue=Blocked",securityPlugin, serverUrl, req.method, req.APIKey, req.apiDomainConfObj.enterpriseName, req.apiDomainConfObj.app_name, req.apiDomainConfObj.entId, req.apiDomainConfObj.appId, ResErrConf.getJSONResp(403).statusCode);
            } else {
                //logger.debug("SecurityPlugin=%s, SecPluginAPI=%s, SecPluginMethod=%s, SecPluginAPIKey=%s, SecPluginEnterpriseName=%s, SecPluginAppName=%s, SecPluginEnterpriseId=%s, SecPluginApplicationId=%s, SecPluginStatusCode=%s, StatusValue=Allowed", securityPlugin, serverUrl, req.method, req.APIKey, req.apiDomainConfObj.enterpriseName, req.apiDomainConfObj.app_name, req.apiDomainConfObj.entId, req.apiDomainConfObj.appId, ResErrConf.getJSONResp(200).statusCode);
            }
            return slotResult;
        }
    },
    //instance variables
    variables: {
        _patterns : null,
        _weakPassRegex : "^(?=.*[0-9])(?=.*[A-Z])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]",
        _formData : null,
        _action : null
    }
    //Class level variables or methods
    //statics : { }
});

module.exports = BodyFormSlot;