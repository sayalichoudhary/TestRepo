/**
 * Adds or Deletes Nginx VHosts according to channel config at run time
 * Created by API Defender on 19/11/2015
 * @version 1.0
 */

// Dependencies
var log4js = require('log4js');
var NginxReload = require('./Nginx_Reload/nginx_reload');
var path = require('path');
var config = require('config');
var fs = require("fs");

// Logger
var logger = log4js.getLogger('NginxVHostUtils');
var APIDomainUtil;

// Nginx options
// Change as per your Nginx configuration on server
var nginxOpts = {
    confDir: config.get("nginxOpts.confDir"),
    pidLocation: config.get("nginxOpts.pidFile"),
    sudo: true,
    ssl_key_loc: global.appRoot + config.get("nginxOpts.cert_key_loc")
};

// Nginx Reload reference
var Nginx;

//
// Constructor of service, initializes nginx reload reference
//
function init(relayUtil) {
    logger.debug("Initializing NginxVHostUtils");

    APIDomainUtil = relayUtil;
    try {
        // Check if the conf.d directory is exist or not at given path
        // If not exist thn create one
        if (!fs.existsSync(nginxOpts.confDir)) {
            fs.mkdirSync(nginxOpts.confDir);
        }

        // Initialize Nginx Reload reference
        Nginx = NginxReload(nginxOpts, function (running) {
            if (!running)
                logger.info("Nginx is not running.");
        });
    } catch (err) {
        logger.error(err);
    }

}

//
// Function to create VHost in conf.d directory and reload nginx
//
function addVHost(opts, callback) {
    var vHost = createVHostConfig(opts);
    var confPath = path.join(nginxOpts.confDir, '/' + opts.name + '.conf');

    fs.writeFile(confPath, vHost, function (err) {
        if (err)
            logger.error(err);
        APIDomainUtil.init();
        Nginx.reload(callback);
    });
}

//
// Function to remove VHost from conf.d directory and reload nginx
//
function removeVHost(name, callback) {
    var confPath = path.join(nginxOpts.confDir, name + '.conf');

    fs.unlink(confPath, function (err) {
        if (err)
            logger.error(err);
        APIDomainUtil.init();
        Nginx.reload(callback)
    })
}

//
// Function to reload nginx
//
function reloadNginx(callback) {
    Nginx.reload(callback);
}

//
// Function to create server config for VHost
//
function createVHostConfig(opts) {
    var host = '';

    if (opts.ssl == 'on') {
        host += ''
            + 'server {\n'
            + '  listen ' + opts.port + ' ssl;\n'
            + '  server_name ' + opts.domain + ';\n'
            + '  \n'
            + '  ssl    on;\n'
            + '  ssl_certificate      ' + nginxOpts.ssl_key_loc + opts.ssl_cert_name + ';\n'
            + '  ssl_certificate_key    ' + nginxOpts.ssl_key_loc + opts.ssl_key_name + ';\n'
            + '  \n'
            + '  ssl_protocols  TLSv1 TLSv1.1 TLSv1.2;\n'
            + '  ssl_ciphers  "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:DHE-DSS-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-DSS-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-DSS-AES256-SHA:DHE-RSA-AES256-SHA:AES128-GCM-SHA256:AES256-GCM-SHA384:AES128-SHA256:AES256-SHA256:AES128-SHA:AES256-SHA:AES:CAMELLIA:DES-CBC3-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!aECDH:!EDH-DSS-DES-CBC3-SHA:!EDH-RSA-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA";\n'
            + '  ssl_prefer_server_ciphers   on;\n'
            + '  ssl_dhparam /etc/ssl/dhparams.pem;\n'
            + '  \n'
    } else {
        host += ''
            + 'server {\n'
            + '  listen ' + opts.port + ';\n'
            + '  server_name ' + opts.domain + ';\n'
            + '  \n';
    }

    host += ' location /apidefender {\n'
        + ' return 403; \n'
        + '}\n';

    host += '  location / {\n'
        + '    proxy_pass http://127.0.0.1:3000;\n'
        + '    proxy_set_header        Host    $host;\n'
        + '    proxy_set_header Accept-Encoding "";\n'
        + '    proxy_set_header X-Forwarded-Proto $scheme;\n'
        + '    proxy_set_header X-Forwarded-For $remote_addr;\n'
        + '  }\n'
        + '}\n';
    return host;
}

//
// Function to create opts format: not currently being used
//
function createOptsFormat() {
    var opts = {
        name: 'Test',
        port: '443',
        domain: 'darshan-prod.mobileo2.com',
        ssl: 'on',
        ssl_cert_name: 'mobileo2.com.chained.crt',
        ssl_key_name: 'mobileo2.com.key'
    };
}

// Interface
module.exports = {
    init: init,
    addVHost: addVHost,
    removeVHost: removeVHost,
    reloadNginx: reloadNginx
};
