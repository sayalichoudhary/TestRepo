/**
 * Instantiates available slots and mounts them during application's bootstrap phase
 * Created by API Defender on 03/23/16
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
//var app = express();
//var bodyParser = require('body-parser');

// Logger
var logger = log4js.getLogger('URLSlotFactory');

// Cache of Slots Object References
var slotObjMap = {};

//
// Function load and initialize Slots from slotPath directory.
//
function initialize() {

    var exp1 = [
        "(\%27)|(\')|(\-\-)|(\%23)|(#)",
        "((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))",
        "\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))"
    ];
    var regExp1 = new RegExp(exp1.join('|'), 'i');

    var exp2 = [
        "((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)",
        "((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)",
        "((\%3C)|<)[^\n]+((\%3E)|>)"
    ];
    var regExp2 = new RegExp(exp2.join('|'), 'i');

    var URLSlot = app.slots.getSlot("URLSlot");

    var URLSlot1 = new URLSlot();
    URLSlot1.setId(1);
    URLSlot1.setPatterns(regExp1);
    URLSlot1.setAction("Block");
    logger.debug("Initializing slot: %s_%s", URLSlot1.getSlotId(), URLSlot1.getId());
    slotObjMap[1] = URLSlot1;

    var URLSlot2 = new URLSlot();
    URLSlot2.setId(2);
    URLSlot2.setPatterns(regExp2);
    URLSlot2.setAction("Block");
    logger.debug("Initializing slot: %s_%s", URLSlot2.getSlotId(), URLSlot2.getId());
    slotObjMap[2] = URLSlot2;
}

//
// Function to fetch slot with specified name.
//
function getSlotObject(id) {

    // Validation
    if (_.isEmpty(id)) {
        return false;
    }

    // Lookup in the Slot Map
    return slotObjMap[id];

}

//
// Function to fetch all URL Slot objects.
//
function getAllSlotObject() {

    return slotObjMap;
}

//
// Interface
//
module.exports = {
    initialize: initialize,
    getSlotObject: getSlotObject,
    getAllSlotObject: getAllSlotObject
}