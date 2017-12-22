/**
 * Sevice class to handle REST response
 * Created by API Defender on 13/03/16
 * @version 1.0
 */

// Response error config
var ResErrConf = require('../config/ErrorResponse/config');

// Dependancies
var js2xmlparser = require("js2xmlparser");
var xmlParserOptions = {
    "declaration": {
        "include": false,
        "encoding": ""
    }
};

// Logger
var log4js = require('log4js');
var logger = log4js.getLogger('RESTHelperUtils');

var error = {
    "Status": 500,
    "Message": "Something went wrong.",
    "Details": "Something went wrong.."
};

//
// Function to send successful response for management APIs
//
function sendOk(req, res, data) {
    var contentType = req.headers['accept-language'];
    if (contentType.indexOf("xml") != -1) {
        logger.info("here");
        data = js2xmlparser("APIDefenderResponse", data, xmlParserOptions);
        logger.info(data);
    }

    if (res) {

        if (contentType.indexOf("xml") != -1) {
            res.end(data);
        } else if (data) {
            res.jsonp(data);
        } else {
            res.send();
        }
    }
}

//
// Function to send given data to client along with statu code
//
function send(req, res, statusCode, data) {

    if (statusCode == null) {
        res.send(data);
    }
    else {
        res.status(statusCode).send(data);
    }
}

//
// Function to send given error response to client by converting it if needed
//
function sendError(req, res, statusCode, errRes) {

    var contentType = req.headers['accept-language'];

    if (typeof errRes == "string") {
        error.Status = statusCode;
        error.Message = errRes;
        error.Details = "";

        if (contentType != undefined && contentType.indexOf("xml") != -1) {
            errRes = js2xmlparser("APIDefenderResponse", error, xmlParserOptions);
        }
    } else {
        if (contentType != undefined && contentType.indexOf("xml") != -1) {
            errRes = js2xmlparser("APIDefenderResponse", errRes.APIDefenderResponse, xmlParserOptions);
        }
    }

    res.status(statusCode).send(errRes);
}

//
// Function to set explicit error code for bad request and return error response.
//
function sendBadRequest(req, res, errMsg) {
    if (null == errMsg) {
        sendError(req, res, 400, ResErrConf.getJSONResp(400).response);
    } else {
        sendError(req, res, 400, errMsg);
    }
}

//
// Function to set explicit error code for unauthrized request and return error response.
//
function sendUnauthorizedRequest(req, res, errMsg) {
    if (null == errMsg) {
        sendError(req, res, 401, ResErrConf.getJSONResp(401).response);
    } else {
        sendError(req, res, 401, errMsg);
    }
}

//
// Function to set explicit error code for unauthenticated request and return error response.
//
function sendUnauthenticatedRequest(req, res, errMsg) {
    if (null == errMsg) {
        sendError(req, res, 403, ResErrConf.getJSONResp(403).response);
    } else {
        sendError(req, res, 403, errMsg);
    }
}

//
// Function to set explicit error code for invalid resource and return error response.
//
function sendNotFound(req, res, errMsg) {
    if (null == errMsg) {
        sendError(req, res, 404, ResErrConf.getJSONResp(404).response);
    } else {
        sendError(req, res, 404, errMsg);
    }
}

//
// Function to set explicit error code for invalid file upload and return error response.
//
function sendUnProcessable(req, res, errMsg) {
    if (null == errMsg) {
        sendError(req, res, 422, ResErrConf.getJSONResp(422).response);
    } else {
        sendError(req, res, 422, errMsg);
    }
}

//
// Function to set explicit error code for exceeding request limit and return error response.
//
function sendTooManyResponse(req, res, errMsg) {
    if (null == errMsg) {
        sendError(req, res, 429, ResErrConf.getJSONResp(429).response);
    } else {
        sendError(req, res, 429, errMsg);
    }
}

//
// Function to set explicit error code for internal server error and return error response.
//
function sendServerError(req, res, errMsg) {
    if (null == errMsg) {
        sendError(req, res, 500, ResErrConf.getJSONResp(500).response);
    } else {
        sendError(req, res, 500, errMsg);
    }
}

//
// Function to set explicit error code for empty file upload and return error response.
//
function sendNotImplemented(req, res, errMsg) {
    if (null == errMsg) {
        sendError(req, res, 501, ResErrConf.getJSONResp(501).response);
    } else {
        sendError(req, res, 501, errMsg);
    }
}

//
// Function to set explicit error code for unexpected error while connecting to target server and return error response.
//
function sendBadGateway(req, res, errMsg) {
    if (null == errMsg) {
        sendError(req, res, 502, ResErrConf.getJSONResp(502).response);
    } else {
        sendError(req, res, 502, errMsg);
    }
}

//
// Interface
//
module.exports.sendOk = sendOk;
module.exports.send = send;
module.exports.sendError = sendError;
module.exports.sendBadRequest = sendBadRequest;
module.exports.sendNotFound = sendNotFound;
module.exports.sendServerError = sendServerError;
module.exports.sendUnAuthorized = sendUnauthorizedRequest;
module.exports.sendUnAuthenticated = sendUnauthenticatedRequest;
module.exports.sendTooManyResponse = sendTooManyResponse;
module.exports.sendNotImplemented = sendNotImplemented;
module.exports.sendUnProcessable = sendUnProcessable;
module.exports.sendBadGateway = sendBadGateway;
