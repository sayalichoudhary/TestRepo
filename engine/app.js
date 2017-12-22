/**
 * Entry point for API Defender, initializes all dependencies
 * Created by API Defender on 02/10/2015
 * @version 1.0
 */

// Dependencies
var log4js = require('log4js');

var path = require('path');
var express = require('express');
var cookieParser = require('cookie-parser');
var cluster = require('cluster');
var schedule = require('node-schedule');
var http = require("http");
var fs = require('fs');
var exec = require('child_process').exec;


// Get underline system's processor cores
var numWorkers = require('os').cpus().length;

//
// Application Root
//
global.appRoot = __dirname;

//
// Directory Paths
//
var configPath = path.join(global.appRoot, "/application/config/");
var slotPath = path.join(global.appRoot, "/framework/slots/");
var controllerPath = path.join(global.appRoot, "/application/controllers/");
var controllerRoutePath = path.join(global.appRoot, "/application/routes/controllers/");
var servicePath = path.join(global.appRoot, "/application/services/");

//
// Current Runtime Environment:
// Config module uses NODE_ENV variable to determine the configuration file to be loaded from the /config directory.
//

if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'local_config';
}

//
// App Configuration:
// node-config module uses the process.env.NODE_CONFIG_DIR to determine the config directory.
//
if (!process.env.NODE_CONFIG_DIR) {
    process.env.NODE_CONFIG_DIR = configPath;
}
var config = require('config');

//
// Logger Initialization
//
var loggerConfig = config.get("logger");
log4js.configure(loggerConfig);

var logger = log4js.getLogger('ApplicationBootstrap');

//
//  Framework components
//
var slotFactory = require('./framework/SlotFactory');
var URLSlotFactory = require("./framework/URLSlotFactory");
var controllerFactory = require('./framework/ControllerFactory');
var serviceFactory = require('./framework/ServiceFactory');

// Utils components
var redisCache = require('./application/utils/RedisCacheService');
var APIDomainUtil = require('./application/utils/APIDomainUtils');
var GeoIPUtils = require('./application/utils/GeoIPUtils');
var NginxVHostUtil = require('./application/utils/NginxVHostUtil');


// Apply clustering and fork worker processes equal to number of CPU cores
if(cluster.isMaster) {
    logger.debug('Master cluster setting up ' + numWorkers + ' workers...');
    // Whenever server starts  it will download the IP files after 15 sec.
    //setTimeout(function() {
    //    try {
    //        exec('downloadGeoIP.sh', function(err, stdout, stderr) {
    //            if (err) {
    //            logger.error(err);
    //            return;
    //            } else {
    //                logger.debug("GeoIP database files are downloaded.");
    //            }
    //    });
    //    } catch (err) {
    //        logger.error(err);
    //        throw err;
    //    }
    //}, 15000);

    //schedule to handle IPv4 and IPv6
    //0 05 11 1-7 * 3 - cron pattern to download the IPv6 file on first wednesday of every month at 09:05 am
   schedule.scheduleJob('0 33 12 1-7 * 3', function() {

       try{
           exec('downloadGeoIP.sh', function(err, stdout, stderr) {
               if (err) {
                   logger.error(err);
                   return;
               } else {
                   logger.debug("GeoIP database files are downloaded.");
               }
           });
       } catch(err) {
            logger.error(err);
           throw err;
       }
   });


    for(var iTmp = 0; iTmp < numWorkers; iTmp++) {
        var worker = cluster.fork();
    }

    cluster.on('online', function(worker) {
        logger.debug('Worker %d is online', worker.process.pid);
    });

    cluster.on('exit', function(worker, code, signal) {
        logger.debug('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
        logger.debug('Starting a new worker');
        cluster.fork();
    });
} else {
    // Start new worker thread

    // Create express application
    var app = express();
    global.app = app;

    //
    // Middleware: Wrap all requests in a domain to be able to handle any async failures in those.
    //
    var errorHandler = require("./framework/middleware/ErrorHandler");
    app.use(errorHandler.domainWrappingMiddleware);

    //
    // Middleware: Cookie Parser.
    // Parses the HTTP Header Cookies and populates the 'req.cookies' having name-value pairs.
    // {cookieName: cookieValue, ...}
    //
    app.use(cookieParser());

    //
    // Middleware: Body Parser.
    // Parses the HTTP Body and populates the req.body.
    //
    //app.use(bodyParser.text({type: '*/*'}));

    //
    // Initializing Redis Cache Service
    // global.app.redisCache: Is a reference to the Redis Cache Service.
    //
    app.redisCache = redisCache;
    app.redisCache.init();

    //
    // Initialize All Slot classes.
    // global.app.slots: Is a reference to the Slot Class Factory.
    //
    app.slots = slotFactory;
    app.slots.initialize(slotPath);

    //
    // Initializing Application Relay Util
    // global.app.apiDomainUtil: Is a reference to the App Relay Utils.
    //
    app.apiDomainUtil = APIDomainUtil;
    app.apiDomainUtil.init();

    //
    // Initializing Nginx Vhosts Util
    // global.app.nginxVhosts: Is a reference to the Nginx Vhosts Util.
    //

    app.nginxVhosts = NginxVHostUtil;
    app.nginxVhosts.init(app.apiDomainUtil);

    //
    // Initializing GeoIP Util
    // global.app.geoIpUtil: Is a reference to the GeoIP Util.
    //

    app.geoIpUtil = GeoIPUtils;
    app.geoIpUtil.init();

    //
    // Initialize all Services.
    // global.app.services: Is a reference to the Service Factory.
    //
    app.services = serviceFactory;
    app.services.initialize(servicePath);

    //
    // Initialize all controllers. Mount All Routes to Respective Controller Methods.
    // global.app.controllers: Is a reference to the Controller Factory.
    //
    app.controllers = controllerFactory;
    app.controllers.initialize(controllerPath, controllerRoutePath);

    //
    // Middleware: Catch-All error handler in express.
    //
    app.use(errorHandler.errorHandlingMiddleware);

    //
    // Bind HTTP Server
    //
    var port = config.get("server.port");
    var server = app.listen(port, function () {
        logger.debug("Traffic Inspection running on Port: %d", port);
    });
}
