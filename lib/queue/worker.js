 
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
 * Redis connections used by `getJob()` when blocking.
 */

var clients = {};

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

Worker.prototype.start = function(delay, fn, errfn){
  var self = this;

  if(typeof delay == 'function') errfn = fn, fn = delay, delay = false;

  if(errfn) self.errfn = errfn;
  if(!self.errfn) self.errfn = Worker.errorCallback;

  var amount = 0;

  if(delay)
      amount = Math.round(Math.random()*30000);
  else
      amount = Math.round(Math.random()*200);

  if(self.stopped) {
      self.queue.stopped(self);
      return self;
  }

  setTimeout(function()
  {
      self.getJob(function(err, job, timeout){
          if (err) self.error(err, job);

          if(timeout)
              return process.nextTick(function(){ self.start(false, fn); });

          if (!job || err)
              return process.nextTick(function(){ self.start(true, fn); });

          self.process(job, fn);
      });
  }, amount);

  return this;
};

/**
 * Tell the worker to stop processing jobs.
 *
 * @api private
 */

Worker.prototype.stop = function() {
    var self = this;

    self.stopped = true;

    // Push a few entries on the queue to trigger blpop to timeout
    // Why delay and trigger more than one?  Someone else might scoop up
    // the event before realizing they are being restarted - so then they
    // have a long delay before they end up restarting.

    setTimeout(function() { self.client.lpush('q:' + self.type + ':jobs', -1, function() {}); }, 2000);
    setTimeout(function() { self.client.lpush('q:' + self.type + ':jobs', -1, function() {}); }, 2000);
};

/**
 * Default error handler callback.
 *
 * @param {String} level        error level (debug, info, warning, error)
 * @param {String} message      error message
 * @param {Object} data         map of additional fields to include in messages. if job is known should include 'job'
 * @api private
 */

Worker.errorCallback = function(level, message, data) {
    console.log(level + ": " + message + " - " + JSON.stringify(data));
};

/**
 * Error handler, currently does nothing.
 *
 * @param {Error} err
 * @param {Job} job
 * @return {Worker} for chaining
 * @api private
 */

Worker.prototype.error = function(err, job) {
  var self = this;
  self.errfn("warning", "Worker failure", {
      job: job ? job.id : undefined,
      type: self.type,
      data: job ? job.data : undefined,
      error: typeof err == 'object' ? err.message : err,
      stack: err.stack
  });

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

  job.failed(function(err2) {
      if(err2) {
          self.errfn("error", "Worker.failed can't move job to failed", { job: job.id, type: self.type });
      }

      job.error(err);
      self.error(err, job);

      job.attempt(function(error, remaining, attempts, max){
          if (error)
          {
              self.error(error, job);
              return self.start(true, fn);
          }

          var state = remaining ? 'inactive' : 'failed';

          job[state](function(err3) {
            if(err3) {
                self.errfn("error", "Worker.failed can't move job to " + state, { job: job.id, type: self.type });
            }

            self.start(fn);
          });
      });
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

  job.active(function(err) {
      if(err) {
          self.errfn("error", "Worker.process can't move job to active", { job: job.id, type: self.type });
          return self.failed(job, err, fn);
      }

      fn(job, function(err){
          if (err) return self.failed(job, err, fn);

          job.complete(function(err) {
              if(err) {
                  self.errfn("error", "Worker.process can't move job to complete", { job: job.id, type: self.type });
              }

              job.set('duration', job.duration = new Date - start);
              self.emit('job complete', job);
              events.emit(job.id, 'complete');
              self.start(fn);
          });
      });
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
  var self = this;

  // alloc a client for this job type
  var client = clients[self.type]
    || (clients[self.type] = redis.createClient());

  // BLPOP indicates we have a new inactive job to process

  var timeout = 45 + Math.round(Math.random()*15);

  client.blpop('q:' + self.type + ':jobs', timeout, function(err, data) {

    if(err) {
      self.errfn("warning", "Worker.getJob waiting for job failed", { error: err.message, type: self.type });

        // Attempt to revert the blpop
        // (after a short pause in case redis had a hiccup)

      setTimeout(function() {
        client.lpush('q:' + self.type + ':jobs', 1, function(err2) {
          if(err2) self.errfn("error", "Worker.getJob could not retry blpop", { error: err2.message, type: self.type });
        });
      }, 2500);

      return fn(err);
    }

    if(!data)
    {
        // We timed out so that the worker can check if it should stop
        return fn(null, null, true);
    }

    if((data.length == 2) && (data[1] == -1))
    {
        // We received a notification that this is a shutdown
        // If we're not really shutting down we'll ignore this quickly
        return fn(null, null, true);
    }

      self.zpop('q:jobs:' + self.type + ':inactive', function(err, id) {
      if (err) {
          self.errfn("warning", "Worker.getJob can't pop job", { error: err.message });

          // Attempt to revert the blpop
          // (after a short pause in case redis had a hiccup)

          setTimeout(function() {
              client.lpush('q:' + self.type + ':jobs', 1, function(err2) {
                  if(err2) self.errfn("error", "Worker.getJob could not revert blpop", { error: err2.message, type: self.type });
              });
          }, 2500);

          return fn(err); // return the outer error
      }

      if (!id) return fn();

      Job.get(id, function(err, job) {
          if(err || !job) {
              self.errfn("warning", "Worker.getJob can't find next job", { job: id, error: err ? err.message : undefined, type: self.type });

              // Attempt to put the job back on the queue if it still exists
              // (after a short pause in case redis had a hiccup)

              setTimeout(function() {
                  var lua =
                        "local state = redis.call('hget', KEYS[1], 'state')\n"
                      + "local jtype = redis.call('hget', KEYS[1], 'type')\n"
                      + "if not state or not jtype or 'inactive' ~= state then return 0 end\n"
                      + "local priority = redis.call('hget', KEYS[1], 'priority')\n"
                      + "if not priority then priority = 0 end\n"
                      + "redis.call('zadd', KEYS[2], tonumber(priority), ARGV[1])\n"
                      + "redis.call('lpush', KEYS[3], 1)\n"
                      + "return 1"
                      ;

                  var jkey = 'q:job:' + id;
                  var qkey = 'q:jobs:' + self.type + ':inactive';
                  var bkey = 'q:' + self.type + ':jobs';

                  self.client.eval(lua, 3, jkey, qkey, bkey, id, function(err3, result) {
                      if(err3 || !result) {
                          self.errfn("error", "Worker.getJob can't add job back to kue", { job: id, error: err3 ? err3.message : undefined, result: result, type: self.type });
                      } else {
                          self.errfn("info", "Worker.getJob added job back to kue", { job: id, type: self.type });
                      }
                  });
              }, 2500);
          }

          return fn(err, job);
      });
    });
  });
};
