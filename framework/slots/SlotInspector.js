/**
 * Abstract Slot Class
 * Created by API Defender on 01-07-2015
 * @version 1.0
 */

var cls = require("simple-cls");
var BaseSlot = require('./SlotInterface.js');

var Slot = cls.defineClass({
	//Class name
	name : "Slot",
	//Optional super class, default is Object
	extend : BaseSlot,
	//Constructor code
	construct : function() {	},
	//instance methods
	methods : {
		setId: function(id) {
			this._id = id;
		},
		getId: function() {
			return this._id;
		},
		getSlotId: function() {
			return this._slotId;
		},
		getData: function() {
			return this._data;
		},
		setData: function(data) {
			this._data = data;
		},
		setAction: function(action) {
			this._action = action;
		},
		getAction: function() {
			return this._action;
		}
	},
	//instance variables
	variables: {
		_id : null,
		_slotId : null,
		_data : null,
		_action : null
	}
	//Class level variables or methods
	//statics : {	}
});

module.exports = Slot;