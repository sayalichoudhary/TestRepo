/**
 * Instantiates available services during application's bootstrap
 * Created by API Defender on 04/21/16
 * @version 1.0
 */

// Dependencies
var log4js = require('log4js');
var path = require('path');
var fsWalk = require('fs-walk');
var bodyParser = require('body-parser');
var express = require('express');
var app = express();
app.use(bodyParser.text({type: '*/*'}));
// Logger
var logger = log4js.getLogger('ServiceFactory');

// Map of Services
var servicesMap = {};

//
// function to load available services from servicePath directory.
//
function initialize(servicePath) {
    app.use(bodyParser.text({type: '*/*'}));
    logger.debug("Loading Services From: %s", servicePath);

    // Recursively Traverse servicePath to load all services
    fsWalk.walkSync(servicePath, function (basedir, file, stat) {

        // Skip directory
        if (stat.isDirectory()) {
            return;
        }

        // Skip if file does not have a Service.js suffix
        if (file.indexOf("Service.js") == -1) {
            return;
        }

        // Mount the router exposed by each controller.
        var serviceFile = path.join(basedir, file)
        var serviceName = file.slice(0, file.indexOf("Service.js"));
        logger.debug("Processing Service: [%s] %s", serviceName, serviceFile);

        // Instantiate and Cache Reference to Service
        service = require(serviceFile);
        service.init();
        servicesMap[serviceName] = service;
    });

}

//
// Function to fetch service with specified name.
// 
function getService(serviceName) {

    // Validation
    if (!serviceName) {
        return false;
    }

    // Lookup in the Service Map
    return servicesMap[serviceName];

}

//
// Interface
//
module.exports = {
    initialize: initialize,
    getService: getService
}