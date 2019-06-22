var _ = require('lodash');

module.exports = function(Job){

  var originalJobSave   = Job.prototype.save,
      originalJobUpdate = Job.prototype.update,
      processQueue = false,
      jobs = [];

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

  var testMode = {}

  /**
   * Enable test mode.
   * @api public
   */

  testMode.enter = function(process) {
    processQueue         = process || false;
    Job.prototype.save   = testJobSave;
    Job.prototype.update = testJobUpdate;
  };

  /**
   * Disable test mode.
   * @api public
   */

  testMode.exit = function() {
    Job.prototype.save   = originalJobSave;
    Job.prototype.update = originalJobUpdate;
  };

  /**
   * Clear the array of queued jobs
   * @api public
   */

  testMode.clear = function() {
    jobs.length = 0;
  };

  testMode.jobs = jobs
  testMode.processQueue = processQueue

  return testMode
}
