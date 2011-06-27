
/**
 * Module dependencies.
 */

var redis = require('redis')
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
 * Get jobs of `status`, with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {String} status
 * @param {Number} from
 * @param {Number} to
 * @param {Function} fn
 * @api public
 */

exports.range = function(status, from, to, fn){
  console.log('regular range %s %d..%d', status, from, to);
  var client = pool.alloc()
    , jobs = [];
  client.zrange('q:jobs:' + status, from, to, function(err, ids){
    if (err) return fn(err);
    var pending = ids.length;
    ids.forEach(function(id){
      exports.get(id, function(err, job){
        if (err) return fn(err);
        jobs.push(job);
        --pending || fn(null, jobs);
      });
    });
  });
};

/**
 * Get jobs of `type` and `status`, with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {String} type
 * @param {String} status
 * @param {Number} from
 * @param {Number} to
 * @param {Function} fn
 * @api public
 */

exports.rangeByType = function(type, status, from, to, fn){
  var client = pool.alloc()
    , jobs = [];
  console.log('type %s range %s %d..%d', type, status, from, to);
  client.zrange('q:jobs:' + type + ':' + status, from, to, function(err, ids){
    if (err) return fn(err);
    var pending = ids.length;
    ids.forEach(function(id){
      exports.get(id, function(err, job){
        if (err) return fn(err);
        jobs.push(job);
        --pending || fn(null, jobs);
      });
    });
  });
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
    job.type = hash.type;
    job.priority(Number(hash.priority));
    job._progress = hash.progress;
    try {
      if (hash.data) job.data = JSON.parse(hash.data);
      fn(err, job);
    } catch (err) {
      fn(err);
    }
  });
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
    , progress: this._progress
  };
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
  this.set('progress', complete / total * 100 | 0);
  return this;
};

/**
 * Set the priority `level`, which is one
 * of "low", "normal", "medium", and "high", or
 * a number in the range of -10..10.
 *
 * @param {String|Number} level
 * @return {Job} for chainging
 * @api public
 */

Job.prototype.priority = function(level){
  this._priority = null == priorities[level]
    ? level
    : priorities[level];
  return this;
};

/**
 * Fetch attemps, invoking callback `fn(remaining, attempts, max)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.attempts = function(fn){
  // TODO: settings ... 
  var max = 5;
  this.client.incr('q:job:' + this.id + ':attempts', function(err, attempts){
    fn(err, max - attempts, attempts, max);
  });
  return this;
};

/**
 * Remove `status`.
 *
 * @param {String} status
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.removeStatus = function(status){
  this.client.zrem('q:jobs:' + status, this.id);
  this.client.zrem('q:jobs:' + this.type + ':' + status, this.id);
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
 *  - converts the job data to JSON
 *  - increments and assigns a job id
 *  - adds the job's type to the set
 *  - marks the job as "inactive"
 *
 * @param {Function} fn
 * @api private
 */

Job.prototype.save = function(fn){
  var client = this.client
    , fn = fn || noop
    , self = this
    , json;

  // serialize json data
  try {
    json = JSON.stringify(this.data);
  } catch (err) {
    return fn(err);
  }

  // incr id
  client.incr('q:ids', function(err, id){
    if (err) return fn(err);
    self.id = id;

    // type
    client.sadd('q:job:types', self.type);
    self.set('type', self.type);

    // priority
    self.set('priority', self._priority);

    // push
    self.inactive();

    // data
    self.set('data', json, fn);
  });
};
