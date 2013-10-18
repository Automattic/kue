
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
  , events = require('./queue/events')
  , Job = require('./queue/job')
  , redis = require('./redis')
  , reds = require('reds')
  , async = require('async');


/**
 * Expose `Queue`.
 */

exports = module.exports = Queue;

/**
 * Library version.
 */

exports.version = '0.6.2';

/**
 * Expose `Job`.
 */

exports.Job = Job;

/**
 * Server instance (that is lazily required)
 */

var app;

/**
 * Expose the server.
 */

Object.defineProperty(exports, 'app', {
  get: function() {
    return app || (app = require('./http'));
  }
});

/**
 * Expose the RedisClient factory.
 */

exports.redis = redis;


/**
 * Search instance.
 */

var search;
function getSearch() {
  if (search) return search;
  reds.createClient = require('./redis').createClient;
  return search = reds.createSearch('q:search');
};


/**
 * Create a new `Queue`.
 *
 * @return {Queue}
 * @api public
 */

exports.createQueue = function(){
  return Queue.singleton = new Queue;
};

/**
 * Store workers
 */
exports.workers = [];

/**
 * Initialize a new job `Queue`.
 *
 * @api public
 */

function Queue() {
  this.client = redis.createClient();
  this.workers = exports.workers;
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
Queue.prototype.createJob = function(type, data, options){
  return new Job(type, data, options);
};

/**
 * Proxy to auto-subscribe to events.
 *
 * @api public
 */

var on = EventEmitter.prototype.on;
Queue.prototype.on = function(event){
  if (0 == event.indexOf('job')) events.subscribe();
  return on.apply(this, arguments);
};

/**
 * Promote delayed jobs, checking every `ms`,
 * defaulting to 5 seconds.
 *
 * @params {Number} ms
 * @api public
 */

Queue.prototype.promote = function(ms,l){
  var client = this.client
    , ms = ms || 5000
    , limit = l || 20;

  setInterval(function(){
    client.sort('q:jobs:delayed'
      , 'by', 'q:job:*->delay'
      , 'get', '#'
      , 'get', 'q:job:*->delay'
      , 'get', 'q:job:*->created_at'
      , 'limit', 0, limit, function(err, jobs){
      if (err || !jobs.length) return;

      // iterate jobs with [id, delay, created_at]
      while (jobs.length) {
        var job = jobs.slice(0, 3)
          , id = parseInt(job[0], 10)
          , delay = parseInt(job[1], 10)
          , creation = parseInt(job[2], 10)
          , promote = ! Math.max(creation + delay - Date.now(), 0);

        // if it's due for activity
        // "promote" the job by marking
        // it as inactive.
        if (promote) {
          Job.get(id, function(err, job){
            if (err) return;
            events.emit(id, 'promotion');
            job.inactive();
          });
        }

        jobs = jobs.slice(3);
      }
    });
  }, ms);
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
    var worker = new Worker(this, type).start(fn);

    worker.on('error', function(err){
      self.emit('error', err);
    });

    worker.on('job complete', function(job){
      self.client.incrby('q:stats:work-time', job.duration);
    });

    // Save worker so we can access it later
    self.workers.push(worker);
  }
};


/**
 * Initializes garbage collection for jobs of `type` after `n` milliseconds.
 * Currently, there is a 1000 millisecond minimum (this should not be primary form of removal)
 *
 * @param {String} type
 * @param {Number} n
 * @api public
 */

Queue.prototype.setExpiration = function(type, n){
  var self = this,
      client = this.client,
      n = Math.max(n, 1000);


  setInterval(function() {

    var cutoff = Math.floor((new Date().getTime() - n) / 1000);

    self.client.zrangebyscore('q:expiring:' + type, 0, cutoff, function(err, results) {

      if (!err && results.length)
        for (var i = 0; i < results.length; ++i)
          Job.remove(results[i]);

    });
  }, n);

  return this;
};


/**
 * Graceful shutdown
 *
 * @param {Function} fn callback
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.shutdown = function(fn, timeout) {
  var origFn = fn || function(){}
    , self = this
    , n = self.workers.length;

  // Wrap `fn` to only call after all workers finished
  fn = function(err) {
    if (err) return origFn(err);
    if (! --n) {
        self.workers = [];
        origFn.apply(null, arguments);
    }
  };
  if (!self.workers.length) origFn();
  // Shut down workers 1 by 1
  self.workers.forEach(function(worker) {
    worker.shutdown(fn, timeout);
  });

  return this;
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
 * Enables job retrieval by id
 *
 * @param {Number} id
 * @param {Function} fn
 * @api public
 */
Queue.prototype.get =
Queue.prototype.getById = function(id, fn){
  Job.get(id, fn);
};


/**
 * Determines whether a job is outstanding. If input is number,
 * taken to be a Job ID. If a string, taken to be a type + key. If an object
 * the key should be either id or key
 *
 * @param {Number} args or {Object}
 * @param {Function} fn
 * @api public
 */

Queue.prototype.isOutstanding = function(args, fn){
  var isKey = false,
      val = null;

  if ("object" == typeof args) {
    if ("undefined" != typeof args.id) {
      val = args.id;
    } else if ("undefined" != typeof args.key && "undefined" != typeof args.type) {
      isKey = true;
    } else {
      return fn(new Error("No key or id specified for outstanding check."))
    }
  } else if ("number" == typeof args) {
    val = args;
  } else {
    return fn(new Error("No key or id specified for outstanding check."))
  }

  if (isKey)
    this.client.sismember("q:outstanding:" + args.type, args.key, function(err, isMember) {
      if (err)
        return fn(err, null);
      else
        return fn(null, 1 == isMember);      
    });
  else {
    this.get(val, function(err, job) {
      if (err)
        return fn(err, false);
      else {
        var state = job.state();
        return fn(err, ('active' == state || 'inactive' == state));
      }
    });
  }
};


/**
 * Find jobs by a series of identifiers and callback `fn(err)`.
 *
 * @param {String} lookup
 * @param {Function} fn
 * @api public
 */

Queue.prototype.find = function(query, fn){
  getSearch().query(query).end(function(err, ids){
    fn(err, ids);
  }, 'and');
};



/**
 * Return job ids with the given `state`, and callback `fn(err, ids)`.
 *
 * @param {String} state
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.state = 
Queue.prototype.states = function(states, fn){
  if ('string' == typeof states)
    this.client.zrange('q:jobs:' + states, 0, -1, fn);
  else {
    var self = this;
    function getByState(state, cb) { self.client.zrange('q:jobs:' + state, 0, -1, cb); }
    async.map(states, getByState, function(err, ids) {
      self = null;
      fn(err, Array.prototype.concat.apply([], ids));
    });
  }
  return this;
};



/**
 * Get queue work time in milliseconds and invoke `fn(err, ms)`.
 *
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.workTime = function(fn){
  this.client.get('q:stats:work-time', function(err, n){
    if (err) return fn(err);
    fn(null, parseInt(n, 10));
  });
  return this;
};

/**
 * Get cardinality of `state` and callback `fn(err, n)`.
 *
 * @param {String} state
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.card = 
Queue.prototype.cards = function(states, fn){
  if ('string' == typeof states)
    this.client.zcard('q:jobs:' + states, fn);
  else {
    var self = this;
    function countByState(state, cb) { self.client.zcard('q:jobs:' + state, cb); }
    async.map(states, countByState, function(err, counts) {
      self = null;
      fn(err, counts.reduce(function(memo, num) { return memo + num; }, 0));
    });
  }
  return this;
};

/**
 * Completed jobs.
 */

Queue.prototype.complete = function(fn){
  return this.state('complete', fn);
};

/**
 * Failed jobs.
 */

Queue.prototype.failed = function(fn){
  return this.state('failed', fn);
};

/**
 * Inactive jobs (queued).
 */

Queue.prototype.inactive = function(fn){
  return this.state('inactive', fn);
};

/**
 * Active jobs (mid-process).
 */

Queue.prototype.active = function(fn){
  return this.state('active', fn);
};

/**
 * Oustanding jobs (inactive or active).
 */

Queue.prototype.outstanding = function(fn){
  return this.state(['active','inactive'], fn);
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

/**
 * Outstanding jobs (active or inactive).
 */

Queue.prototype.outstandingCount = function(fn){
  return this.card(['active','inactive'], fn);
};

/**
 * Delayed jobs.
 */

Queue.prototype.delayedCount = function(fn){
  return this.card('delayed', fn);
};
