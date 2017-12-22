/**
 * Slot Interface Class
 * Created by API Defender on 01-07-2015
 * @version 1.0
 */

var cls = require("simple-cls");

var BaseSlot = cls.defineClass({
	//Class name
	name : "BaseSlot",
	//Optional super class, default is Object
	//extend : ClassName,
	//Constructor code
	//construct : function() {	},
	//instance methods
	methods : {
		getSlotId: function() {
			throw new Error('Need to implement');
		}
	}
	//instance variables
	//variables	: {		},
	//Class level variables or methods
	//statics : {	}
});

module.exports = BaseSlot;