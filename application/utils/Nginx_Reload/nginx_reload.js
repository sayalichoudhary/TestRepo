/**
 * Sevice class to handle nginx process reload
 * Created by API Defender on 30/03/16
 * @version 1.0
 */

// Dependencies
var fs = require('fs')
var path = require('path')
var procinfo = require('procinfo')
var exec = require('child_process').exec

module.exports = Reloader

// Function to set nginx reload option and reload the nginx
function Reloader(opts, onChange) {
  if (!(this instanceof Reloader)) return new Reloader(opts, onChange)
  if (typeof opts === 'string') opts = {pidLocation: opts}
  if (!opts) opts = {}
  this.pidLocation = opts.pidLocation || '/run/nginx.pid'
  this.sudo = opts.sudo ? 'sudo ' : ''
  this.onChange = onChange || function noop(){}
  this.online = undefined
  this.pid = undefined
  this.readPID()
}

//
// watch the appropriate location
//
Reloader.prototype.end = function() {
  if (this.watcher) this.watcher.close()
}

// Function to send the reload configuration (HUP) signal to the nginx process.
Reloader.prototype.reload = function(cb) {
  exec(this.sudo + 'service nginx reload', function(err, stdout, stderr) {
    if (cb) cb(err, stdout, stderr)
  })
}

//
// Function to start nginx process
//
Reloader.prototype.start = function(cb) {
  exec(this.sudo + 'service nginx start', function(err, stdout, stderr) {
    if (cb) cb(err, stdout, stderr)
  })
}

//
// Function to stop nginx process
//
Reloader.prototype.stop = function(cb) {
  exec(this.sudo + 'service nginx stop', function(err, stdout, stderr) {
    if (cb) cb(err, stdout, stderr)
  })
}

//
// Function to read nginx pid file
//
Reloader.prototype.readPID = function() {
  var self = this
  var pidLocation = this.pidLocation
  var onChange = this.onChange
  // open the pid file
  fs.readFile(pidLocation, 'utf8', function(err, data) {
    var watchTarget = err ? path.dirname(pidLocation) : pidLocation

    // if we hit an error opening the file, then the pid file does not exist
    // therefore we will assume that nginx is not running
    if (err) {
      // if we are currently online, then update flag
      if (typeof self.online === 'undefined' || self.online) {
        self.online = false
        onChange(self.online)
      }
    }
    // otherwise, read the file and check on the process status
    else {
      procinfo(parseInt(data, 10), function(err, processData) {
        self.pid = processData.pids[0]
        var status = self.online
        self.online = !err
        if (status !== self.online) onChange(self.online)
      })
    }

    // watch the appropriate location and trigger a reread when something changes
    self.watcher = fs.watch(watchTarget, function(evt, filename) {
      this.close()
      self.readPID()
    })
  })
}
