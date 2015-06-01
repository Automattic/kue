var Job = require('./job'),
    _   = require('lodash');

var originalJobSave   = Job.prototype.save,
    originalJobUpdate = Job.prototype.update,
    jobs;

function testJobSave( fn ) {
  this.id = parseInt(_.uniqueId());
  jobs.push(this);
  if( _.isFunction(fn) ) fn();
  return this;
}

function testJobUpdate( fn ) {
  if( _.isFunction(fn) ) fn();
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
};
