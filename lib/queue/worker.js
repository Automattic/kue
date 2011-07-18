
/*!
 * kue - Worker
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , redis = require('redis')
  , Job = require('./job')
  , jobCallback = require('./callback');;

/**
 * Expose `Worker`.
 */

module.exports = Worker;

/**
 * Initialize a new `Worker` with the given Queue
 * targetting jobs of `type`.
 *
 * @param {Queue} queue
 * @param {String} type
 * @api private
 */

function Worker(queue, type) {
  this.queue = queue;
  this.type = type;
  this.client = redis.createClient();
  this.interval = 1000;
}

/**
 * Inherit from `EventEmitter.prototype`.
 */

Worker.prototype.__proto__ = EventEmitter.prototype;

/**
 * Start processing jobs with the given `fn`,
 * checking for jobs every second (by default).
 *
 * @param {Function} fn
 * @return {Worker} for chaining
 * @api private
 */

Worker.prototype.start = function(fn){
  var self = this;
  self.getJob(function(err, job){
    if (err) self.error(err, job);
    if (!job || err) return setTimeout(function(){ self.start(fn); }, self.interval);
    self.process(job, fn);
  });
  return this;
};

/**
 * Error handler, currently does nothing.
 *
 * @param {Error} err
 * @param {Job} job
 * @return {Worker} for chaining
 * @api private
 */

Worker.prototype.error = function(err, job){
  // TODO: emit non "error"
  console.error(err.stack || err.message);
  return this;
};

/**
 * Process a failed `job`. Set's the job's state
 * to "failed" unless more attempts remain, in which
 * case the job is marked as "inactive" and remains
 * in the queue.
 *
 * @param {Function} fn
 * @return {Worker} for chaining
 * @api private
 */

Worker.prototype.failed = function(job, err, fn){
  var self = this;
  jobCallback.changeStatus(job.id, 'failed');
  job.failed().error(err);
  self.error(err, job);
  job.attempt(function(error, remaining, attempts, max){
    if (error) return self.error(error, job);
    remaining
      ? job.inactive()
      : job.failed();
    self.start(fn);
  });
};

/**
 * Process `job`, marking it as active,
 * invoking the given callback `fn(job)`,
 * if the job fails `Worker#failed()` is invoked,
 * otherwise the job is marked as "complete".
 *
 * @param {Job} job
 * @param {Function} fn
 * @return {Worker} for chaining
 * @api public
 */

Worker.prototype.process = function(job, fn){
  var self = this
    , start = new Date;
  job.active();
  fn(job, function(err){
    if (err) return self.failed(job, err, fn);
    job.complete();
    job.set('duration', job.duration = new Date - start);
    self.emit('job complete', job);
    jobCallback.changeStatus(job.id, 'complete');
    self.start(fn);
  });
  return this;
};

/**
 * Atomic ZPOP implementation.
 *
 * @param {String} key
 * @param {Function} fn
 * @api private
 */

Worker.prototype.zpop = function(key, fn){
  var client = this.client;
  client.watch(key);
  client.zrange(key, 0, 0, function(err, ids){
    if (err) return fn(err);
    var id = ids.shift();

    if (!id) {
      client.unwatch();
      return fn();
    }

    client
      .multi()
      .zrem(key, id)
      .exec(function(err, res){
        if (err) return fn(err);
        if (!res) return fn();
        fn(null, id);
      });
  });
};

/**
 * Attempt to fetch the next job. 
 *
 * @param {Function} fn
 * @api private
 */

Worker.prototype.getJob = function(fn){
  this.zpop('q:jobs:' + this.type + ':inactive', function(err, id){
    if (err) return fn(err);
    if (!id) return fn();
    Job.get(id, fn);
  });
};
