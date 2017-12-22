var res200JSON = require('./200.json');
var res400JSON = require('./400.json');
var res401JSON = require('./401.json');
var res403JSON = require('./403.json');
var res404JSON = require('./404.json');
var res422JSON = require('./422.json');
var res429JSON = require('./429.json');
var res500JSON = require('./500.json');
var res501JSON = require('./501.json');
var res502JSON = require('./502.json');

exports.getJSONResp = function(errorCode) {
    switch(errorCode) {
        case 200: return res200JSON;
            break;
        case 400: return res400JSON;
            break;
        case 401: return res401JSON;
            break;
        case 403: return res403JSON;
            break;
        case 404: return res404JSON;
            break;
        case 422: return res422JSON;
            break;
        case 429: return res429JSON;
            break;
        case 500: return res500JSON;
            break;
        case 501: return res501JSON;
            break;
        case 502: return res502JSON;
            break;
    }
};