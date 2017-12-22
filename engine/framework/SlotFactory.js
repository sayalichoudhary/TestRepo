/**
 * Instantiates available slots and mounts them during application's bootstrap phase
 * Created by API Defender on 17/04/16
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
var app = express();
var bodyParser = require('body-parser');

// Logger
var logger = log4js.getLogger('SlotFactory');

// Cache of Slots References
// [/v1/MySlot] => Reference to SlotModule.function
var slotMap = {};

//
// Function to load and initialize Slots from slotPath directory.
//
function initialize(slotPath) {
    app.use(bodyParser.text({type: '*/*'}));
    //
    // Recursively traverse 'slotPath' to load and initialize all slot modules.
    //
    logger.debug("Loading slots From: %s", slotPath);
    fsWalk.walkSync(slotPath, function (basedir, file, stat) {

        // Skip directory
        if (stat.isDirectory()) {
            return;
        }

        // Skip if file does not have a Slot.js suffix
        if (file.indexOf("Slot.js") == -1) {
            return;
        }

        // Relative base path of this slot module
        var slotFile = path.join(basedir, file);
        logger.debug("Loading slot File: %s", slotFile);

        // Relative slot name [/v1/MySlot]
        var startIndex = slotPath.length;
        var relativeSlotName = slotFile.substring(startIndex, slotFile.length);
        var relativeSlotName = relativeSlotName.substring(0, relativeSlotName.indexOf(".js"));
        //relativeSlotName = path.join("/", relativeSlotName);

        // Instantiate slot module
        logger.debug("Initializing slot: [%s] %s", relativeSlotName, slotFile);
        slot = require(slotFile);

        // Populate slot cache
        slotMap[relativeSlotName] = slot;

    });
}

//
// Function to fetch slot with specified name.
//
function getSlot(slotName) {

    // Validation
    if (_.isEmpty(slotName)) {
        return false;
    }

    // Lookup in the Slot Map
    return slotMap[slotName];

}

//
// Function to fetch all slots.
//
function getSlots() {

    // Lookup in the Slot Map
    return slotMap;

}

//
// Interface
//
module.exports = {
    initialize: initialize,
    getSlot: getSlot,
    getSlots: getSlots
}