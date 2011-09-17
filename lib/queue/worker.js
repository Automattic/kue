 
/*!
 * kue - Worker
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , redis = require('../redis')
  , events = require('./events')
  , Job = require('./job');

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
  this.client = Worker.client || (Worker.client = redis.createClient());
  this.interval = 1000;
  this.active_jobs = [];
  this._exit = false;

  self = this;
  // we try our best to free resources when node goes down
  process.on('SIGTERM', this.emergencyRelease);
  process.on('SIGINT', this.emergencyRelease);
  process.on('exit', function() { self.emergencyRelease(true);});
}

/**
 * emergencyRelease of allocated resources of the current running jobs.
 * Is called when a deadly signal is received, but may be usefull when
 * jobserver goes down. 
 *
 * @api public
 */

Worker.prototype.emergencyRelease = function(in_exit) {
  var todo = 0;
  this._exit = true;

  done = function() {
    todo = todo - 1;
    if(todo < 1) { setTimeout(process.exit, 0); }
  }

  for(var i = 0; i < self.active_jobs.length; i++) {
    var djob = self.active_jobs[i];

    // no need for jobs without resources
    if (Object.keys(djob.resources).length == 0)
      continue;

    todo += 1;
    // fire in parallel
    setTimeout(function() { djob.freeResources(done); }, 0);
  }

  if(todo == 0 && !in_exit)
    process.exit(0);
  else if(todo)
    console.log("kue: emergency ressource release of " + todo + " jobs");
  //setTimeout(function() { process.exit(0); },200);
  return false;
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
  if(self._exit)
    return this;
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
  events.emit(job.id, 'failed');
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
  self.active_jobs.push(job);
  job.active();
  done = function(err){
    // ensure the resources are freed on the end of the job
    job.freeResources(function() {
        self.active_jobs.splice(self.active_jobs.indexOf(job), 1);

        if (err === "kue: requeue") return self.start(fn);
        if (err) return self.failed(job, err, fn);

        job.complete();
        job.set('duration', job.duration = new Date - start);
        self.emit('job complete', job);
        events.emit(job.id, 'complete');
        self.start(fn);
    });
  }
  // for useResources
  job._done = done;
  fn(job, done);
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
  this.client
    .multi()
    .zrange(key, 0, 0)
    .zremrangebyrank(key, 0, 0)
    .exec(function(err, res){
      if (err) return fn(err);
      var id = res[0][0];
      fn(null, id);
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
