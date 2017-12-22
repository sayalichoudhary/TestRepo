/**
 * Processes managements APIs like upload Policy, Identity and CRUD on APIDomain
 * Created by API Defender on 08/10/2015
 * @version 1.0
 */

// Dependencies
var log4js = require('log4js');
var fs = require('fs');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var path = require('path');
var config = require('config');
var validatorPAth = path.join(global.appRoot, '/xmlValidator/xmllint.js');
var xml = require(validatorPAth);
var ssl = require('ssl-utils');

// Logger
var logger = log4js.getLogger('ManagementAPIController');

// Services and utils references
var ManagementAPIService = global.app.services.getService("ManagementAPI");
var RedisCache = global.app.redisCache;
var RESTHelper = require('../utils/RESTHelper');

// Response error config
var ResErrConf = require('../config/ErrorResponse/config');

//
// Lifecycle Init Handler
//
function init() {
    logger.debug("ManagementAPIController Initialization");
}

//
// Function to validate XML file with schema file
//
function validateXMLPolicyFile(uploadedFileName, policyFilePath) {
    var schemaPath = path.join(global.appRoot, "/application/utils/policySchema.xsd");
    try {
        var xmlData = fs.readFileSync(policyFilePath, 'utf8');
        var schemaData = fs.readFileSync(schemaPath, 'utf8');
    } catch (err) {

        logger.error(err);
        return false;
    }
    var schemaFileName = 'policySchema.xsd';
    var xmlFileName = uploadedFileName;
    var reg = RegExp('[^a-zA-Z0-9<?/" ][<][^/a-zA-Z0-9]', 'g');
    var xmlStr = xmlData.replace(reg, '|less)');
    var reg2 = RegExp('[^a-zA-Z0-9<?/" ][>][^/a-zA-Z0-9]', 'g');
    xmlStr = xmlStr.replace(reg2, '|greater)');
    var Module = {
        xml: xmlStr,
        schema: schemaData,
        arguments: ["--noout", "--schema", schemaFileName, xmlFileName]
    };

    var result = xml.validateXML(Module);
    xmllint = uploadedFileName + " validates";
    if (result == xmllint) {
        logger.debug(uploadedFileName + " is valid policy file.");
        return true;
    } else {
        logger.error(uploadedFileName + " is not valid policy file.");
        fs.unlinkSync(policyFilePath);
        return false;
    }
}

//
// Function to load policy files in policyFiles folder
//

var policyFilePath;
function policy(req, res) {
    var fileName = "";
    var uploadedFileName;
    if (req.url == '/apidefender/policy') {
        var file = JSON.stringify(req.files);
        var start = file.indexOf('{');
        var last = file.indexOf(':');
        var fileName = file.substring(start + 2, last - 1);
        if (start >= 0 && last >= 1) {
            uploadedFileName = req.files[fileName].originalname;
            policyFilePath = path.join(global.appRoot, "/policyFiles/" + uploadedFileName);
            var isValid = validateXMLPolicyFile(uploadedFileName, policyFilePath);

            if (isValid) {
                RESTHelper.sendOk(req, res, ResErrConf.getJSONResp(200).response);
                policyIdentityObject(policyFilePath, uploadedFileName, "policy");
            } else {
                RESTHelper.sendUnProcessable(req, res);
            }
        } else {
            RESTHelper.sendNotImplemented(req, res);
        }
    }
}
//
// Function will read the policy files and send object to cache module
//
function policyIdentityObject(filePath, fileName, fileType) {

    var fileNameType = "";
    var data = fs.readFileSync(filePath, 'utf8');
    if (fileName.indexOf(".xml") > -1) {
        fileNameType = "xml";
        // also change the function to async and move next logic to callback
        parser.parseString(data, function (err, result) {

            if (err) return err;
            if (fileType == "policy") {
                ManagementAPIService.addPolicyObject(result, fileNameType);
            } else if (fileType == "identity") {
                ManagementAPIService.addIdentityObject(result, fileNameType);
            }
        });
    } else if (fileName.indexOf(".json") > -1) {
        fileNameType = "json";
        var result = JSON.parse(data);
        if (fileType = "policy") {
            ManagementAPIService.addSlotObject(result, fileNameType);
        } else if (fileType == "identity") {

        }
    }
}


//
// Function to load Identities files in policyFiles folder
//
var identityFilePath;
function identity(req, res) {
    var fileName = "";
    var uploadedFileName;
    if (req.url == '/apidefender/identity') {
        var file = JSON.stringify(req.files);
        var start = file.indexOf('{');
        var last = file.indexOf(':');
        var fileName = file.substring(start + 2, last - 1);
        if (start >= 0 && last >= 1) {
            uploadedFileName = req.files[fileName].originalname;
            identityFilePath = path.join(global.appRoot, "/policyFiles/" + uploadedFileName);
            RESTHelper.sendOk(req, res, ResErrConf.getJSONResp(200).response);
            policyIdentityObject(identityFilePath, uploadedFileName, "identity");
        } else {
            RESTHelper.sendNotImplemented(req, res);
        }
    }
}


//
// Function to process APIDomain APIs
//
function apiDomainConfig(req, res) {

    var apiDomainFilePath = path.join(global.appRoot, "/application/config/Application-Relay.json");
    var apiDomainData = fs.readFileSync(apiDomainFilePath, 'utf8');
    apiDomainData = JSON.parse(apiDomainData);

    if (req.url.indexOf("/apidefender/apidomain/entid/") != -1 && req.method == "GET") {
        // get apiDomain using entid
        ManagementAPIService.getAPIDomain(req, res, "entId", apiDomainData);
    } else if (req.url.indexOf("/apidefender/apidomain/apidomainid") != -1 && req.method == "GET") {
        //get apidomain using apidomainid
        ManagementAPIService.getAPIDomain(req, res, "apiDomainId", apiDomainData);
    } else if (req.url == "/apidefender/apidomain" && req.headers['content-type'] == "application/json" && req.method == "POST") {
        // Add apiDomain
        ManagementAPIService.addAPIDomain(req, res, apiDomainData);
    } else if (req.url.indexOf("/apidefender/apidomain/entid/") != -1 && req.headers['content-type'] == "application/json" && req.method == "PUT") {
        // update apidomain using entid
        ManagementAPIService.updateAPIDomain(req, res, "entId", apiDomainData);
    } else if (req.url.indexOf("/apidefender/apidomain/apidomainid/") != -1 && req.headers['content-type'] == "application/json" && req.method == "PUT") {
        // update apidomain using apidomainid
        ManagementAPIService.updateAPIDomain(req, res, "apiDomainId", apiDomainData);
    } else if (req.url.indexOf("/apidefender/apidomain/entid/") != -1 && req.method == "DELETE") {
        // delete apidomain using entid
        ManagementAPIService.deleteAPIDomain(req, res, "entId", apiDomainData);
    } else if (req.url.indexOf("/apidefender/apidomain/apidomainid/") != -1 && req.method == "DELETE") {
        // delete apidomain using apidomainid
        ManagementAPIService.deleteAPIDomain(req, res, "apiDomainId", apiDomainData);
    } else {
        // If API doesn't match with anyone of the above API's
        RESTHelper.sendBadRequest(req, res);
    }
}// end of apiDomainConfig


//
// Function to verify certificate and key match
//

function verifyCertificateKey(req, res, apiDomainObj) {
    var sslFolderPath = path.join(global.appRoot, "/ssl_certs/" + apiDomainObj.enterpriseName + "-" + apiDomainObj.apiDomainId);
    var certificatePath = path.join(global.appRoot, "/ssl_certs/" + req.files.certificate.originalname);
    var keyPath = path.join(global.appRoot, "/ssl_certs/" + req.files.key.originalname);
    var certificateData = fs.readFileSync(certificatePath);
    var keyData = fs.readFileSync(keyPath);
    var passPhraseValue = {"pass": ""};
    var bodyObj = JSON.stringify(req.body);
    if (bodyObj.indexOf("passphrase") > -1) {
        passPhraseValue.pass = req.body.passphrase;
    }
    ssl.verifyCertificateKey(certificateData, keyData, passPhraseValue, function (err, result) {
        if (err) {
            logger.error(err);
            logger.error('Something\'s wrong: cert invalid, key invalid, key encrypted or else');
            res.end("Certificate and key are not matching")
        } else {
            if (result.match) {

                fs.writeFileSync(path.join(sslFolderPath, req.files.certificate.originalname), certificateData);
                fs.writeFileSync(path.join(sslFolderPath, req.files.key.originalname), keyData);
                fs.unlinkSync(certificatePath);
                fs.unlinkSync(keyPath);
                RESTHelper.sendOk(req, res, ResErrConf.getJSONResp(200).response);

            } else {
                fs.unlinkSync(certificatePath);
                fs.unlinkSync(keyPath);
                RESTHelper.sendBadRequest(req, res);
            }
        }
    });
}


//
// Function to upload SSL certificate and key to ssl_cert folder.
//
function uploadSSL(req, res) {
    var apiDomainId = req.params.apiDomainId;
    app.apiDomainUtil.init();
    var apiDomainObj = app.apiDomainUtil.getAPIDomainObjectByAPIDomainId(apiDomainId);
    var certificatePath, keyPath, sslFolderPath;
    var bodyObj = JSON.stringify(req.body);


    if (req.files.certificate == undefined && req.files.key == undefined) {

        logger.debug("Please provide correct field name for certificate and key.");
        RESTHelper.sendBadRequest(req, res);

    } else if (req.files.certificate == undefined) {
        // delete key file
        keyPath = path.join(global.appRoot, "/ssl_certs/" + req.files.key.originalname);
        fs.unlinkSync(keyPath);
        RESTHelper.sendBadRequest(req, res);

    } else if (req.files.key == undefined) {
        //delete certificate file
        certificatePath = path.join(global.appRoot, "/ssl_certs/" + req.files.certificate.originalname);
        fs.unlinkSync(certificatePath);
        RESTHelper.sendBadRequest(req, res);

    } else if (apiDomainObj.apiDomainId == "default") {
        //If apiDomainId not found then remove the cert and key from ssl_cert folder.
        keyPath = path.join(global.appRoot, "/ssl_certs/" + req.files.key.originalname);
        fs.unlinkSync(keyPath);
        certificatePath = path.join(global.appRoot, "/ssl_certs/" + req.files.certificate.originalname);
        fs.unlinkSync(certificatePath);
        RESTHelper.sendBadRequest(req, res);

    } else if (apiDomainObj.ssl_certificate_name != req.files.certificate.originalname || apiDomainObj.ssl_key_name != req.files.key.originalname) {
        // Check weather uploaded cert and key file names are same as apiDomain config.

        keyPath = path.join(global.appRoot, "/ssl_certs/" + req.files.key.originalname);
        fs.unlinkSync(keyPath);
        certificatePath = path.join(global.appRoot, "/ssl_certs/" + req.files.certificate.originalname);
        fs.unlinkSync(certificatePath);
        RESTHelper.sendBadRequest(req, res);

    } else if (bodyObj.length > 2 && bodyObj.indexOf("passphrase") == -1) {
        keyPath = path.join(global.appRoot, "/ssl_certs/" + req.files.key.originalname);
        fs.unlinkSync(keyPath);
        certificatePath = path.join(global.appRoot, "/ssl_certs/" + req.files.certificate.originalname);
        fs.unlinkSync(certificatePath);
        RESTHelper.sendBadRequest(req, res);

    } else {
        // move certificate and key to respective enterprise Name folder

        sslFolderPath = path.join(global.appRoot, "/ssl_certs/" + apiDomainObj.enterpriseName + "-" + apiDomainObj.apiDomainId);
        fs.stat(sslFolderPath, function (err, stat) {

            if (err == null) {
                logger.debug("%s folder is exists.", apiDomainObj.enterpriseName + "-" + apiDomainObj.apiDomainId);
                verifyCertificateKey(req, res, apiDomainObj);
            } else if (err.code == 'ENOENT') {
                logger.debug("%s folder is created.", apiDomainObj.enterpriseName + "-" + apiDomainObj.apiDomainId);
                fs.mkdirSync(sslFolderPath, 0777);
                verifyCertificateKey(req, res, apiDomainObj);
                app.nginxVhosts.reloadNginx(function (err) {
                    if (err)
                        logger.error(err);
                });
            } else {
                logger.error('Some other error: ', err.code);
            }
        });
    }
}

// Interface
module.exports = {
    init: init,
    policy: policy,
    identity: identity,
    apiDomainConfig: apiDomainConfig,
    uploadSSL: uploadSSL
};
