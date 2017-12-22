/**
 * Instantiates available controllers and mounts them during application's bootstrap phase.
 * Created by API Defender on 04/05/16
 * @version 1.0
 */

// Dependencies
var log4js = require('log4js');
var fs = require('fs');
var fsWalk = require('fs-walk');
var path = require('path');
var express = require("express");
var stripJsonComments = require('strip-json-comments');
var _ = require('underscore');
var multer = require('multer');
var app = express();
var bodyParser = require('body-parser');
//var validatorFactory = require('./ValidatorFactory.js')

// Logger
var logger = log4js.getLogger('ControllerFactory');

// Cache of Controllers References
// Ex. [/InspectionController] => Reference to ControllerModule.function
var controllerMap = {};

// Supported HTTP methods (Add more as needed)
var supportedMethods = ["all", "get", "put", "post", "delete", "head"];

//
// Function to load and initialize controllers from controllerPath directory.
// Also mounts all controllers into ExpressJS as per the provided routeDefs.
//
function initialize(controllerPath, routeDefinitionPath) {

    //
    // Recursively traverse 'controllerPath' to load and initialize all controller modules.
    //
    logger.debug("Loading Controllers From: %s", controllerPath);
    fsWalk.walkSync(controllerPath, function (basedir, file, stat) {

        // Skip directory
        if (stat.isDirectory()) {
            return;
        }

        // Skip if file does not have a Controller.js suffix
        if (file.indexOf("Controller.js") == -1) {
            return;
        }

        // Relative base path of this controller module
        var controllerFile = path.join(basedir, file);
        logger.debug("Loading Controller File: %s", controllerFile);

        // Relative controller name [/v1/MyController]
        var startIndex = controllerPath.length;
        var relativeControllerName = controllerFile.substring(startIndex, controllerFile.length);
        var relativeControllerName = relativeControllerName.substring(0, relativeControllerName.indexOf(".js"));
        //relativeControllerName = path.join("/", relativeControllerName);

        // Instantiate controller module
        logger.debug("Initializing Controller: [%s] %s", relativeControllerName, controllerFile);
        controller = require(controllerFile);

        // Invoke controller init
        if (typeof(controller.init) === 'function') {
            controller.init();
        }

        // Populate controller cache
        controllerMap[relativeControllerName] = controller;

    });

    //
    // Iterate thru all route definition JSON files to mount specified routes.
    //
    logger.debug("Loading Route Definitions From: %s", routeDefinitionPath);
    fsWalk.walkSync(routeDefinitionPath, function (basedir, file, stat) {

        // Skip directory
        if (stat.isDirectory()) {
            return;
        }

        // Skip if file does not have a Controller.json suffix
        if (file.indexOf(".json") === -1) {
            return;
        }

        // Mount this route configuration (comprising of multiple routes)
        var routeConfigFile = basedir + file;
        mountRoutes(routeConfigFile);

    });

}

var uploadFileName;
//
// Function to mount routes based on the specified route configuration JSON.
// Maps route URIs to specific controller functions.
//
function mountRoutes(routeConfigFile) {

    // Read routes file and attempt to parse JSON
    try {
        var contents = fs.readFileSync(routeConfigFile, 'utf8');
        var routeConfig = JSON.parse(stripJsonComments(contents));
    } catch (e) {
        logger.error("Failed to parse routes JSON file: %s", routeConfigFile);
        return;
    }

    // Validate routeConfig to be not empty
    if (_.isUndefined(routeConfig) || _.isNull(routeConfig) || _.isEmpty(routeConfig)) {
        logger.error("Empty route configuration. Skipping.");
        return;
    }

    // Validate required elements in the routeConfig
    if (_.isEmpty(routeConfig.config)) {
        logger.error("Bad route configuration. Missing 'config' parameter.");
        return;
    }

    if (_.isEmpty(routeConfig.config.status) || routeConfig.config.status !== "ACTIVE") {
        logger.error("Not an active route definition. Skipping.");
        return;
    }

    if (_.isEmpty(routeConfig.routes)) {
        logger.error("Bad route configuration. Missing 'routes' parameter.");
        return;
    }

    // Extract configuration info
    var uriPrefix = _.isEmpty(routeConfig.config.prefix) ? "" : routeConfig.config.prefix;
    var routeDefs = routeConfig.routes;

    // Mount all routes in this route definition
    for (var i in routeDefs) {
        // Route Definition
        var routeDef = routeDefs[i];
        if (_.isEmpty(routeDef)) {
            logger.error("Empty route definition found in file %s.", routeConfigFile);
            continue;
        }

        // Route URI
        if (_.isEmpty(routeDef.requestUri)) {
            logger.error("Skipping route. Empty 'requestUri' in route: %s", JSON.stringify(routeDef));
            continue;
        }
        var routeUri = uriPrefix + routeDef.requestUri;

        // Validate HTTP method
        var httpMethod = _.isEmpty(routeDef.httpMethod) ? "get" : routeDef.httpMethod;

        if (supportedMethods.indexOf(httpMethod) < 0) {
            logger.error("Skipping route. Unsupported HTTP method %s in %s.", httpMethod, JSON.stringify(routeDef));
            continue;
        }

        // Request handler
        if (_.isEmpty(routeDef.handler)) {
            logger.error("Empty 'handler' in %s. Skipping.", JSON.stringify(routeDef));
            continue;
        }

        var handlerName = routeDef.handler;
        var controllerName = handlerName.slice(0, handlerName.indexOf("."));
        var methodName = handlerName.slice(handlerName.indexOf(".") + 1);

        if (_.isEmpty(controllerName) || _.isEmpty(methodName)) {
            logger.error("Bad handler in %s. Skipping.", JSON.stringify(routeDef));
            continue;
        }

        // Reference to target method
        var method = controllerMap[controllerName][methodName];

        // Validate function reference before mounting
        if (typeof(method) !== 'function') {
            logger.error("Bad Handler Method: %s", handlerName);
            continue;
        }

        // Mount validator middleware at this URI
        //logger.debug("Mounting Validator At: [%s] [%s]", routeUri, httpMethod);
        //var validationMiddleware = validatorFactory.getValidator(routeDef);
        //var validationRouter = express.Router();
        //validationRouter[httpMethod](routeUri, validationMiddleware);
        //global.app.use(validationRouter);

        // Mount the main route
        logger.debug("Mounting: [%s] [%s] %s", routeUri, httpMethod, handlerName);
        var router = express.Router({"foo": "bar"});

        var URLType = routeDef.type;
        if (URLType == 'upload') { // to upload policy and identity file.

            var upload = multer({
                dest: 'policyFiles/',
                rename: function (fieldname, filename) {
                    uploadFileName = filename;
                    return filename;
                },
                onFileUploadStart: function (file) {
                    if (file.extension != "json" && file.extension != "xml") {
                        return false;
                    }
                },
                limits: {
                    files: 1
                },
                onFileUploadComplete: function (file) {
                    if (file.extension != "json" && file.extension != "xml") {
                        return false;
                    }
                }
            });
            router[httpMethod](routeUri, upload, method);
            global.app.use(router);

        } else if (URLType == "APIDomain") { // for Channels API

            var jsonParser = bodyParser.json();
            router[httpMethod](routeUri, jsonParser, method);
            global.app.use(router);

        } else if (URLType == "uploadSSL") { // to upload SSL certificate and key

            var uploadSSL = multer({
                dest: 'ssl_certs/',
                rename: function (fieldname, filename) {
                    uploadFileName = filename;
                    return filename;
                },
                onFileUploadStart: function (file) {
                    if (file.fieldname == "certificate") {
                        return true;
                    } else if (file.fieldname == "key") {
                        return true;
                    } else {
                        return false;
                    }
                    //file.fieldname = "upload";
                    //if(file.extension != "crt" || file.extension != "key"){
                    //    return false;
                    //}
                },
                limits: {
                    files: 2
                },
                onFileUploadComplete: function (file) {
                    //logger.info(file)
                    //if(file.extension != "crt" || file.extension != "key") {
                    //    return false;
                    //}
                }

            });
            router[httpMethod](routeUri, uploadSSL, method);
            global.app.use(router);

        } else { // for other requests

            var textParser = bodyParser.text({type: '*/*'});
            router[httpMethod](routeUri, textParser, method);
            global.app.use(router);
        }
    }
    ;
}

//
// Function to fetch controller with specified name.
//
function getController(controllerName) {

    // Validation
    if (_.isEmpty(controllerName)) {
        return false;
    }

    // Lookup in the Controller Map
    return controllerMap[controllerName];

}

//
// Interface
//
module.exports = {
    initialize: initialize,
    getController: getController
};