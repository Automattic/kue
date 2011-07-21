
/*!
 * kue
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , Worker = require('./queue/worker')
  , Job = require('./queue/job')
  , redis = require('redis');

/**
 * Expose `Queue`.
 */

exports = module.exports = Queue;

/**
 * Library version.
 */

exports.version = '0.1.0';

/**
 * Expose `Job`.
 */

exports.Job = Job;

/**
 * Expose the server.
 */

exports.app = require('./http');

/**
 * Create a new `Queue`.
 *
 * @return {Queue}
 * @api public
 */

exports.createQueue = function(){
  return new Queue;
};

/**
 * Initialize a new job `Queue`.
 *
 * @api public
 */

function Queue() {
  this.client = redis.createClient();
}

/**
 * Inherit from `EventEmitter.prototype`.
 */

Queue.prototype.__proto__ = EventEmitter.prototype;

/**
 * Create a `Job` with the given `type` and `data`.
 *
 * @param {String} type
 * @param {Object} data
 * @return {Job}
 * @api public
 */

Queue.prototype.create =
Queue.prototype.createJob = function(type, data, after){
  return new Job(type, data, after);
};

/**
 * Get setting `name` and invoke `fn(err, res)`.
 *
 * @param {String} name
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.setting = function(name, fn){
  this.client.hget('q:settings', name, fn);
  return this;
};

/**
 * Process jobs with the given `type`, invoking `fn(job)`.
 *
 * @param {String} type
 * @param {Number|Function} n
 * @param {Function} fn
 * @api public
 */

Queue.prototype.process = function(type, n, fn){
  var self = this;

  if ('function' == typeof n) fn = n, n = 1;

  while (n--) {
    (function(worker){
      worker.on('error', function(err){
        self.emit('error', err);
      });

      worker.on('job complete', function(job){
        self.client.incrby('q:stats:work-time', job.duration);
      });
    })(new Worker(this, type).start(fn));
  }
};

/**
 * Promotes jobs from queue
 *
 * @param {timestamp} promotes jobs smaller then timestamp
 * @api public
 */

Queue.prototype.promote = function(timestamp){
  var client = this.client,
      self = this;

  var limit = 30;

  if (typeof(timestamp) == 'undefined')
    timestamp = new Date().getTime();

  var promoted = [];
  
  function promo_log() {
    if(promoted.length > 0)
      console.log("kue promoted " + promoted.length + " job(s): " + promoted.join(","));
  }

  function promote_chunks() {
    client.sort('q:jobs:wait', 'by', 'q:job:after:*', 'limit', '0', limit, 'asc',
      function(err, sorted) {
        // no jobs todo
        if(err || !sorted || sorted.length == 0) {
          promo_log();
          return;
        }

        args = sorted.map(function(i) { return "q:job:after:" + i})

        // callback is last parameter call
        args.push(function xstamps(err, stamps) {
          for(i = 0; i < limit; i++) {
            if(stamps[i] <= timestamp) {
              // promote job
              promoted.push(sorted[i]);
              Job.get(sorted[i], function(err, job) {
                job.inactive()
              })
            } else {
               // only older entries exist
               promo_log();
               return;
            }
          }
          promote_chunks();
        });
        client.mget.apply(client, args);
      }
    );
  }
  promote_chunks();
};


/**
 * Get the job types present and callback `fn(err, types)`.
 *
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.types = function(fn){
  this.client.smembers('q:job:types', fn);
  return this;
};

/**
 * Return job ids for the given `status`, and
 * callback `fn(err, ids)`.
 *
 * @param {String} status
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.status = function(status, fn){
  this.client.zrange('q:jobs:' + status, 0, -1, fn);
  return this;
};

/**
 * Get cardinality of `status` and callback `fn(err, n)`.
 *
 * @param {String} status
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.card = function(status, fn){
  this.client.zcard('q:jobs:' + status, fn);
  return this;
};

/**
 * Completed jobs.
 */

Queue.prototype.complete = function(fn){
  return this.status('complete', fn);
};

/**
 * Failed jobs.
 */

Queue.prototype.failed = function(fn){
  return this.status('failed', fn);
};

/**
 * Inactive jobs (queued).
 */

Queue.prototype.inactive = function(fn){
  return this.status('inactive', fn);
};

/**
 * Active jobs (mid-process).
 */

Queue.prototype.active = function(fn){
  return this.status('active', fn);
};

/**
 * Completed jobs count.
 */

Queue.prototype.completeCount = function(fn){
  return this.card('complete', fn);
};

/**
 * Failed jobs count.
 */

Queue.prototype.failedCount = function(fn){
  return this.card('failed', fn);
};

/**
 * Inactive jobs (queued) count.
 */

Queue.prototype.inactiveCount = function(fn){
  return this.card('inactive', fn);
};

/**
 * Active jobs (mid-process).
 */

Queue.prototype.activeCount = function(fn){
  return this.card('active', fn);
};
