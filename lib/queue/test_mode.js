var Job = require('./job'),
    _   = require('lodash');

var originalJobSave   = Job.prototype.save,
    originalJobUpdate = Job.prototype.update,
    processQueue,
    jobs;

function testJobSave( fn ) {
  if(processQueue) {
    jobs.push(this);
    originalJobSave.call(this, fn);
  } else {
    this.id = _.uniqueId();
    jobs.push(this);
    if( _.isFunction(fn) ) fn();    
  }
};

function testJobUpdate( fn ) {
  if(processQueue) {
    originalJobUpdate.call(this, fn);
  } else {
    if( _.isFunction(fn) ) fn();
  }
};

/**
 * Array of jobs added to the queue
 * @api public
 */

module.exports.jobs = jobs = [];
module.exports.processQueue = processQueue = false;

/**
 * Enable test mode.
 * @api public
 */

module.exports.enter = function(process) {
  processQueue         = process || false;
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
