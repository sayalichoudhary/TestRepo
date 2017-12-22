/**
 * Retrieves client IP from incoming request, finds the country code from GeoIP database and protects from insecure origin
 * Created by API Defender on 25/12/2015
 * @version 1.0
 */

// Dependencies
var path = require('path');
var fs = require('fs');
var net = require('net');
var log4js = require('log4js');
var maxmindV4 = require('maxmind');
var maxmindV6 = require('maxmind');

// Logger
var logger = log4js.getLogger('GeoIPUtils');

//
// constructor of service
//
function init() {

    var ipv4FilePath = path.join(global.appRoot, "/IpDatabase/GeoIP.dat");
    var ipv6FilePath = path.join(global.appRoot, "/IpDatabase/GeoIPv6.dat");

    if (fs.existsSync(ipv4FilePath)) {
        fs.watch(ipv4FilePath, function (event, filename) {
            if (filename) {
                if (fs.existsSync(ipv4FilePath)) {
                    setTimeout(function () {
                        maxmindV4.init(path.join(global.appRoot, "/IpDatabase/GeoIP.dat"), {
                            memoryCache: true,
                            checkForUpdates: true
                        });
                    }, 100);
                }
                logger.debug("Filename name : %s, File event : %s", filename, event);
            } else {
                logger.debug('Filename not provided.');
            }
        });
    }
    if (fs.existsSync(ipv6FilePath)) {
        fs.watch(ipv6FilePath, function (event, filename) {
            if (filename) {
                setTimeout(function () {
                    if (fs.existsSync(ipv6FilePath)) {
                        maxmindV6.init(path.join(global.appRoot, "/IpDatabase/GeoIPv6.dat"), {
                            memoryCache: true,
                            checkForUpdates: true
                        });
                    }
                }, 100);
                logger.debug("Filename name : %s, File event : %s", filename, event);
            } else {
                logger.debug('Filename not provided');
            }
        });
    }

    if (fs.existsSync(ipv4FilePath)) {
        maxmindV4.init(path.join(global.appRoot, "/IpDatabase/GeoIP.dat"), {memoryCache: true, checkForUpdates: true});
    }
    if (fs.existsSync(ipv6FilePath)) {
        maxmindV6.init(path.join(global.appRoot, "/IpDatabase/GeoIPv6.dat"), {
            memoryCache: true,
            checkForUpdates: true
        });
    }
    logger.debug("Initializing GeoIPUtils");
}

//
// Function to find the country code from GeoIP database using ip address.
//
function insecureOrigin(req, callback) {

    var IpAddress = req.headers['x-forwarded-for'];
    try {
        if (net.isIP(IpAddress) == 4 && net.isIPv4(IpAddress)) {
            var country = maxmindV4.getCountry(IpAddress);
            logger.trace("Country name is : %s and country code is : %s.", country.name, country.code);
            callback(country.code)
        } else if (net.isIP(IpAddress) == 6 && net.isIPv6(IpAddress)) {
            var country = maxmindV6.getCountryV6(IpAddress);
            logger.trace("Country name is : %s and country code is : %s.", country.name, country.code);
            callback(country.code);
        }
    } catch (err) {
        logger.error(err);
    }
}

//
// Interface
//
module.exports = {
    init: init,
    insecureOrigin: insecureOrigin
};