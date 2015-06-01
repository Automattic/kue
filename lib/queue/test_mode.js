var Job = require('./job'),
    _   = require('lodash');

var originalJobSave   = Job.prototype.save,
    originalJobUpdate = Job.prototype.update,
    idCounter = 0,
    jobs;

function testJobSave( fn ) {
  this.id = idCounter++;
  this.created_at = Date.now();
  this.promote_at = this.created_at + (this._delay || 0);
  this.updated_at = this.created_at;
  jobs.push(this);
  if( _.isFunction(fn) ) fn();
  return this;
}

function testJobUpdate( fn ) {
  this.updated_at = Date.now();
  if( _.isFunction(fn) ) fn();
  return this;
}

/**
 * Array of jobs added to the queue
 * @api public
 */

module.exports.jobs = jobs = [];

/**
 * Enable test mode.
 * @api public
 */

module.exports.enter = function() {
  Job.prototype.save   = testJobSave;
  Job.prototype.update = testJobUpdate;
};

/**
 * Disable test mode.
 * @api public
 */

module.exports.exit = function() {
  Job.prototype.save   = originalJobSave;
  Job.prototype.update = originalJobUpdate;
};

/**
 * Clear the array of queued jobs
 * @api public
 */

module.exports.clear = function() {
  jobs.length = 0;
  idCounter = 0;
};
