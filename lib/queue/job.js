
/*!
 * kue - Job
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , events = require('./events')
  , pool = require('./pool')
  , noop = function(){};

/**
 * Expose `Job`.
 */

exports = module.exports = Job;

/**
 * Default job priority map.
 */

var priorities = exports.priorities = {
    low: 10
  , normal: 0
  , medium: -5
  , high: -10
  , critical: -15
};

/**
 * Sort the given `jobs` by priority / id.
 *
 * @param {Array} jobs
 * @return {Array}
 * @api private
 */

function sort(jobs) {
  return jobs.sort(function(a, b){
    return a.id - b.id + a.priority() - b.priority();
  });
}

/**
 * Return a function that handles fetching
 * of jobs by the ids fetched.
 *
 * @param {Function} fn
 * @param {String} order
 * @return {Function}
 * @api private
 */

function get(fn, order) {
  return function(err, ids){
    if (err) return fn(err);
    var pending = ids.length
      , jobs = [];
    if (!pending) return fn(null, ids);
    ids.forEach(function(id){
      exports.get(id, function(err, job){
        if (err) return fn(err);
        jobs.push(job);
        --pending || fn(null, 'desc' == order
          ? sort(jobs).reverse()
          : sort(jobs));
      });
    });
  }
}

/**
 * Get with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */

exports.range = function(from, to, order, fn){
  pool.alloc().zrange('q:jobs', from, to, get(fn, order));
};

/**
 * Get jobs of `status`, with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {String} status
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */

exports.rangeByStatus = function(status, from, to, order, fn){
  pool.alloc().zrange('q:jobs:' + status, from, to, get(fn, order));
};

/**
 * Get jobs of `type` and `status`, with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {String} type
 * @param {String} status
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */

exports.rangeByType = function(type, status, from, to, order, fn){
  pool.alloc().zrange('q:jobs:' + type + ':' + status, from, to, get(fn, order));
};

/**
 * Get job with `id` and callback `fn(err, job)`.
 *
 * @param {Number} id
 * @param {Function} fn
 * @api public
 */

exports.get = function(id, fn){
  var client = pool.alloc()
    , job = new Job;

  job.id = id;
  client.hgetall('q:job:' + job.id, function(err, hash){
    if (err) return fn(err);
    if (!hash.type) return fn();
    // TODO: really lame, change some methods so 
    // we can just merge these
    job.type = hash.type;
    job.delay(hash.delay);
    job.priority(Number(hash.priority));
    job._progress = hash.progress;
    job._attempts = hash.attempts;
    job._max_attempts = hash.max_attempts;
    job.state = hash.state;
    job._error = hash.error;
    job.created_at = hash.created_at;
    job.updated_at = hash.updated_at;
    job.failed_at = hash.failed_at;
    job.duration = hash.duration;
    try {
      if (hash.data) job.data = JSON.parse(hash.data);
      fn(err, job);
    } catch (err) {
      fn(err);
    }
  });    
};

/**
 * Remove job `id` if it exists and invoke callback `fn(err)`.
 *
 * @param {Number} id
 * @param {Function} fn
 * @api public
 */

exports.remove = function(id, fn){
  exports.get(id, function(err, job){
    if (err) return fn(err);
    if (!job) return fn(new Error('failed to find job ' + id));
    job.removeStatus(job.state, fn);
  });
};

/**
 * Get log for job `id` and callback `fn(err, log)`.
 *
 * @param {Number} id
 * @param {Function} fn
 * @return {Type}
 * @api public
 */

exports.log = function(id, fn){
  var client = pool.alloc();
  client.lrange('q:job:' + id + ':log', 0, -1, fn);
};

/**
 * Initialize a new `Job` with the given `type` and `data`.
 *
 * @param {String} type
 * @param {Object} data
 * @api public
 */

function Job(type, data) {
  this.type = type;
  this.data = data || {};
  this.client = pool.alloc();
  this.priority('normal');
}

/**
 * Return JSON-friendly object.
 *
 * @return {Object}
 * @api public
 */

Job.prototype.toJSON = function(){
  return {
      id: this.id
    , type: this.type
    , data: this.data
    , priority: this._priority
    , progress: this._progress || 0
    , state: this.state
    , error: this._error
    , created_at: this.created_at
    , updated_at: this.updated_at
    , failed_at: this.failed_at
    , duration: this.duration
    , delay: this._delay
    , attempts: {
        made: this._attempts
      , remaining: this._max_attempts - this._attempts
      , max: this._max_attempts
    }
  };
};

/**
 * Log `str` with sprintf-style variable args.
 *
 * Examples:
 *
 *    job.log('preparing attachments');
 *    job.log('sending email to %s at %s', user.name, user.email);
 *
 * Specifiers:
 *
 *   - %s : string
 *   - %d : integer
 *
 * @param {String} str
 * @param {Mixed} ...
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.log = function(str){
  var args = arguments
    , i = 1;

  str = str.replace(/%([sd])/g, function(_, type){
    var arg = args[i++];
    switch (type) {
      case 'd': return arg | 0;
      case 's': return arg;
    }
  });

  this.client.rpush('q:job:' + this.id + ':log', str);
  return this;
};

/**
 * Set job `key` to `val`.
 *
 * @param {String} key
 * @param {String} val
 * @param {String} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.set = function(key, val, fn){
  this.client.hset('q:job:' + this.id, key, val, fn || noop);
  return this;
};

/**
 * Set the job progress by telling the job
 * how `complete` it is relative to `total`.
 *
 * @param {Number} complete
 * @param {Number} total
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.progress = function(complete, total){
  if (0 == arguments.length) return this._progress;
  var n = Math.min(100, complete / total * 100 | 0);
  this.set('progress', n);
  events.emit(this.id, 'progress', n);
  return this;
};

/**
 * Set the job delay in `ms`.
 *
 * @param {Number} ms
 * @return {Job|Number}
 * @api public
 */

Job.prototype.delay = function(ms){
  if (0 == arguments.length) return this._delay;
  this._delay = ms;
  return this;
};

/**
 * Set or get the priority `level`, which is one
 * of "low", "normal", "medium", and "high", or
 * a number in the range of -10..10.
 *
 * @param {String|Number} level
 * @return {Job|Number} for chaining
 * @api public
 */

Job.prototype.priority = function(level){
  if (0 == arguments.length) return this._priority;
  this._priority = null == priorities[level]
    ? level
    : priorities[level];
  return this;
};

/**
 * Increment attemps, invoking callback `fn(remaining, attempts, max)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.attempt = function(fn){
  var self = this
    , client = this.client
    , id = this.id
    , key = 'q:job:' + id;

  client.hsetnx(key, 'max_attempts', 1, function(){
    client.hget(key, 'max_attempts', function(err, max){
      client.hincrby(key, 'attempts', 1, function(err, attempts){
        fn(err, Math.max(0, max - attempts), attempts, max);
      });
    });
  });

  return this;
};

/**
 * Set max attempts to `n`.
 *
 * @param {Number} n
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.attempts = function(n){
  this._max_attempts = n;
  return this;
};

/**
 * Remove `status` with optional callback `fn`.
 *
 * @param {String} status
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.removeStatus = function(status, fn){
  this.client.zrem('q:jobs', this.id);
  this.client.zrem('q:jobs:' + status, this.id);
  this.client.zrem('q:jobs:' + this.type + ':' + status, this.id, fn || noop);
  return this;
};

/**
 * Set the job's failure `err`.
 *
 * @param {Error} err
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.error = function(err){
  if (0 == arguments.length) return this._error;
  var str = err.stack || err.message
    , summary = str.split('\n')[0];
  this.set('failed_at', Date.now());
  this.set('error', str);
  this.log('%s', summary);
  return this;
};

/**
 * Set state to `status`.
 *
 * @param {String} status
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.status = function(status){
  this.state = status;
  this.removeStatus('complete');
  this.removeStatus('failed');
  this.removeStatus('inactive');
  this.removeStatus('active');
  this.set('state', status);
  this.client.zadd('q:jobs', this._priority, this.id);
  this.client.zadd('q:jobs:' + status, this._priority, this.id);
  this.client.zadd('q:jobs:' + this.type + ':' + status, this._priority, this.id);
  return this;
};

/**
 * Set status to "complete", and progress to 100%.
 */

Job.prototype.complete = function(){
  return this.set('progress', 100).status('complete');
};

/**
 * Set status to "failed".
 */

Job.prototype.failed = function(){
  return this.status('failed');
};

/**
 * Set status to "inactive".
 */

Job.prototype.inactive = function(){
  return this.status('inactive');
};

/**
 * Set status to "active".
 */

Job.prototype.active = function(){
  return this.status('active');
};

/**
 * Save the job, optionally invoking the callback `fn(err)`.
 *
 * @param {Function} fn
 * @api public
 */

Job.prototype.save = function(fn){
  var client = this.client
    , fn = fn || noop
    , max = this._max_attempts
    , self = this;

  // update
  if (this.id) return this.update(fn);

  // incr id
  client.incr('q:ids', function(err, id){
    if (err) return fn(err);
    var key = 'q:job:' + id;
    self.id = id;
    self.state = 'inactive';
    if (max) client.hset(key, 'max_attempts', max);
    client.sadd('q:job:types', self.type);
    self.set('type', self.type);
    self.set('created_at', Date.now());
    self.update(fn);

    // add the job for event mapping
    if (self.listeners('complete').length
      + self.listeners('failed').length
      + self.listeners('progress').length) {
      events.add(self);
    }
  });
};

/**
 * Update the job and callback `fn(err)`.
 *
 * @param {Function} fn
 * @api public
 */

Job.prototype.update = function(fn){
  var json;

  // serialize json data
  try {
    json = JSON.stringify(this.data);
  } catch (err) {
    return fn(err);
  }

  // delay
  if (this._delay) this.set('delay', this._delay);

  // updated timestamp
  this.set('updated_at', Date.now());

  // priority
  this.set('priority', this._priority);

  // status
  this.status(this.state);

  // data
  this.set('data', json, fn);
};

Job.prototype.__proto__ = EventEmitter.prototype;