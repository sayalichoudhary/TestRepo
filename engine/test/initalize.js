/**
 * Initializes all necessary modules to run the test cases
 * Created by API Defender on 10/04/2016
 * @version 1.0
 */

var log4js = require('log4js');
var path = require('path');
var express = require('express');
var cookieParser = require('cookie-parser');
var fs = require('fs');

// Get underline system's processor cores

// Application Root

global.appRoot = __dirname;

// Directory Paths

var configPath = path.join(global.appRoot, "../application/config/");

var slotPath = path.join(global.appRoot, "../framework/slots/");
var controllerPath = path.join(global.appRoot, "../application/controllers/");
var controllerRoutePath = path.join(global.appRoot, "../application/routes/controllers/");
var servicePath = path.join(global.appRoot, "../application/services/");


// Current Runtime Environment:

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
}
    // console.log(global.appRoot)


// App Configuration:

if (!process.env.NODE_CONFIG_DIR) {
    process.env.NODE_CONFIG_DIR = configPath;
}

var config = require('config');

// Logger Initialization

var loggerConfig = config.get("logger");
log4js.configure(loggerConfig);

//  Framework components
var slotFactory = require('../framework/SlotFactory');
var URLSlotFactory = require("../framework/URLSlotFactory");
var controllerFactory = require('../framework/ControllerFactory');
var serviceFactory = require('../framework/ServiceFactory');

// Utils components
var redisCache = require('../application/utils/RedisCacheService');
var APIDomainUtil = require('../application/utils/APIDomainUtils');
var GeoIPUtils = require('../application/utils/GeoIPUtils');

var app = express();
global.app = app;


// Middleware: Wrap all requests in a domain to be able to handle any async failures in those.

var errorHandler = require("../framework/middleware/ErrorHandler");
app.use(errorHandler.domainWrappingMiddleware);

// Middleware: Cookie Parser.

app.use(cookieParser());

// Initializing Redis Cache Service

app.redisCache = redisCache;
app.redisCache.init();

// Initialize All Slot classes.

app.slots = slotFactory;
app.slots.initialize(slotPath);

// Initializing Application Relay Utils

var TIpath = global.appRoot;
global.appRoot = TIpath.substring(0,TIpath.indexOf("test")-1);

app.apiDomainUtil = APIDomainUtil;
app.apiDomainUtil.init();



app.geoIpUtil = GeoIPUtils;
app.geoIpUtil.init();


// Initialize all Services.

app.services = serviceFactory;
app.services.initialize(servicePath);


// Initialize all controllers. Mount All Routes to Respective Controller Methods.

app.controllers = controllerFactory;
app.controllers.initialize(controllerPath, controllerRoutePath);