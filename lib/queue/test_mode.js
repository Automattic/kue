var Job = require('./job'),
  _ = require('lodash'),
  Queue = require('./../kue'),
  noop = function () {},
  idCounter = 0,
  queue = Queue.createQueue(), // This is a singleton
  workers = [],
  jobs;

Job.prototype.save = function( fn ) {
  var job = this;

  this.id = idCounter++;
  this.created_at = Date.now();
  this.promote_at = this.created_at + (this._delay || 0);
  jobs.push(this);
  this.emit('enqueue');
  queue.emit('job enqueue', job.id, job.type);
  return this.update(fn);
};

Job.prototype.update = function( fn ) {
  fn = fn || noop;
  this.updated_at = Date.now();
  fn();
  return this;
};

Queue.prototype.process = function(name, fn) {
  var worker = function(id, type) {
    var job = _.find(jobs, function(queuedJob) {
      return queuedJob.id === id;
    });
    var done = function(err, result) {
      if (err) {
        job.emit('failed', err.message);
        queue.emit('job failed', job.id, err.message);
      } else {
        job.result = result;
        job.emit('complete', result);
        queue.emit('job complete', job.id, result);
      }
    };

    if (name === type) {
      fn(job, done);
    }
  };

  workers.push(worker);
  queue.on('job enqueue', worker);
};

/**
 * Array of jobs added to the queue
 * @api public
 */

module.exports.jobs = jobs = [];

/**
 * Clear the array of queued jobs
 * @api public
 */

module.exports.clear = function() {
  jobs.length = 0;
  idCounter = 0;
  workers.forEach(function(worker) {
    queue.removeListener('job enqueue', worker);
  });
  workers = [];
};
