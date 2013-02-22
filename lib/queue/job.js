
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
  , redis = require('../redis')
  , reds = require('reds')
  , crypto = require('crypto')
  , noop = function(err){ if(err) console.log('error: ignoring in noop', err); };

/**
 * Expose `Job`.
 */

exports = module.exports = Job;

/**
 * Search instance.
 */

var search;
function getSearch() {
  if (search) return search;
  reds.createClient = require('../redis').createClient;
  return search = reds.createSearch('q:search');
};

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
 * Map `jobs` by the given array of `ids`.
 *
 * @param {Object} jobs
 * @param {Array} ids
 * @return {Array}
 * @api private
 */

function map(jobs, ids){
  var ret = [];
  ids.forEach(function(id){
    if (jobs[id]) ret.push(jobs[id]);
  });
  return ret;
}

/**
 * Fetch the jobs for each of the given ids
 *
 * @param {Array} ids
 * @param {String} order		asc or desc
 * @param {Function} fn
 * @api private
 */

function jobsForIds(ids, order, fn) {
	var pending = ids.length
	  , jobs = {};
	if (!pending) return fn(null, ids);
	ids.forEach(function(id){
	  exports.get(id, function(err, job){
	    if (err || !job) return fn(err);
	    jobs[job.id] = job;
	    --pending || fn(null, 'desc' == order
	      ? map(jobs, ids).reverse()
	      : map(jobs, ids));
	  });
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
    jobsForIds(ids, order, fn);
  };
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
  redis.client().zrange('q:jobs', from, to, get(fn, order));
};

/**
 * Get job IDs of `state`, with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {String} state
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */

exports.idRangeByState = function(state, from, to, order, fn){
  redis.client().zrange('q:jobs:' + state, from, to, fn);
};

/**
 * Get jobs of `state`, with the range `from`..`to`
 * and invoke callback `fn(err, jobs)`.
 *
 * @param {String} state
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */

exports.rangeByState = function(state, from, to, order, fn){
    redis.client().zrange('q:jobs:' + state, from, to, get(fn, order));
};


/**
 * Get jobs of `type` and `state`, with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {String} type
 * @param {String} state
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */

exports.rangeByType = function(type, state, from, to, order, fn){
  redis.client().zrange('q:jobs:' + type + ':' + state, from, to, get(fn, order));
};

/**
 * Get job with `id` and callback `fn(err, job)`.
 *
 * @param {Number} id
 * @param {Function} fn
 * @api public
 */

exports.get = function(id, fn){
  var client = redis.client()
    , job = new Job;

  job.id = id;
  client.hgetall('q:job:' + job.id, function(err, hash){
    if (err) return fn(err);
    if (!hash.type) return fn();
    // TODO: really lame, change some methods so 
    // we can just merge these
    job.type = hash.type;
    job._delay = Number(hash.delay);
    job._group = hash.group;
    job._heartbeat = Number(hash.heartbeat);
    job.priority(Number(hash.priority));
    job._progress = hash.progress;
    job._attempts = Number(hash.attempts);
    job._restarts = Number(hash.restarts);
    job._max_attempts = Number(hash.max_attempts);
    job._max_restarts = Number(hash.max_restarts);
    job._state = hash.state;
    job._error = hash.error;
    job.created_at = Number(hash.created_at);
    job.updated_at = Number(hash.updated_at);
    job.failed_at = Number(hash.failed_at);
    job.duration = Number(hash.duration);
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
    job.remove(fn);
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
  redis.client().lrange('q:job:' + id + ':log', 0, -1, fn);
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
  this.client = redis.client();
  this.priority('normal');
}

/**
 * Inherit from `EventEmitter.prototype`.
 */

Job.prototype.__proto__ = EventEmitter.prototype;

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
    , state: this._state
    , error: this._error
    , created_at: this.created_at
    , updated_at: this.updated_at
    , failed_at: this.failed_at
    , duration: this.duration
    , delay: this._delay
    , heartbeat: this._heartbeat
    , attempts: {
        made: this._attempts
      , remaining: this._max_attempts - this._attempts
      , max: this._max_attempts
    }
  	, restarts: {
      made: this._restarts
      , remaining: this._max_restarts - this._restarts
      , max: this._max_restarts
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
  this._state = 'delayed';
  return this;
};

/**
 * Set the job heartbeat to be required every `ms`.
 * 
 * If called with no arguments, this will trigger the heartbeat of
 * the job so that it won't get restarted.
 *
 * @param {Number} ms
 * @return {Job|Number}
 * @api public
 */

Job.prototype.heartbeat = function(ms){
  if (0 == arguments.length) {
	  if(this._heartbeat) {
		  this.set('update_by', Date.now() + this._heartbeat);
	  }
	  return this._heartbeat;
  }
  this._heartbeat = ms;
  return this;
};

/**
 * Sets a job as part of a staged group
 *
 * @param {Job} precursor
 * @return {Job|String}
 * @api public
 */

Job.prototype.serialize = function(group){
  if (0 == arguments.length) return this._group;
  this._group = group;
  if(this._state != 'delayed') this._state = 'staged';
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
 * Increment restarts, invoking callback `fn(remaining, restarts, max)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.restart = function(fn) {
  var self = this
    , client = this.client
    , id = this.id
    , key = 'q:job:' + id;

  client.hsetnx(key, 'max_restarts', 1, function(){
    client.hget(key, 'max_restarts', function(err, max){
      client.hincrby(key, 'restarts', 1, function(err, restarts){
        fn(err, Math.max(0, Number(max) + 1 - restarts), restarts, max);
      });
    });
  });

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
 * Set max restarts to `n`.
 *
 * @param {Number} n
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.restarts = function(n){
  this._max_restarts = n;
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
 * Remove the job and callback `fn(err)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.remove = function(fn){
  var self = this;
  var client = self.client;

  this.state('removed', function(err)
  {
      if(err) return (fn || noop)(err);

      getSearch().remove(this.id);
      client.del('q:job:' + this.id, noop);
      client.del('q:job:' + this.id + ':state', noop);
      client.del('q:job:' + this.id + ':log', fn || noop);
  });

  return this;
};

/**
 * Set state to `state`.
 *
 * @param {String} script
 * @return {Job} for chaining
 * @api private
 */

var scripts = {};
var scriptCache = {};

Job.prototype.cachedEval = function(script) {
    var args = Array.prototype.slice.call(arguments, 0);
    var fn = args[args.length-1];
    var hash = scriptCache[script];
    var self = this;
    var client = self.client;

    if(typeof fn != 'function') {
        args.push(noop);
        fn = noop;
    }

    if(!hash) {
      hash = crypto.createHash('sha1').update(scripts[script], 'utf8').digest('hex');
      scriptCache[script] = hash;
    }

    args[0] = hash;
    args[args.length-1] = function(err) {
        if(err && (err.message.indexOf('NOSCRIPT') >= 0)) {
            console.log("info: loading script " + script + " into cache as " + scriptCache[script]);

            args[0] = scripts[script];
            args[args.length-1] = fn;

            return client.eval.apply(client, args);
        }
        else {
            return fn.apply(self, arguments);
        }
    };

    client.evalsha.apply(client, args);
    return this;
};

/**
 * Set state to `state`.
 *
 * @param {String} state
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

scripts.stateLUA =
      "local acquire = nil\n"
    + "local stateChange = nil\n"
    + "acquire = function(id, priority, group)\n"
        + "if not group or group == '' then return 0 end\n"
        + "priority = tonumber(priority)\n"
        + "if not priority then priority = 0 end\n"
        + "local owner = redis.call('get', 'q:lockowners:' .. group)\n"
        + "if owner and owner ~= id then\n"
            + "local oprio = tonumber(redis.call('hget', 'q:job:' .. owner, 'priority'))\n"
            + "local ostate = redis.call('hget', 'q:job:' .. owner, 'state')\n"
            + "local otype = redis.call('hget', 'q:job:' .. owner, 'type')\n"
            + "if not oprio then oprio = 0 end\n"
            + "if 'inactive' == ostate and otype and oprio > priority then\n"
                + "if redis.call('zrem', 'q:jobs:' .. otype .. ':inactive', owner) == 1 then\n"
                    + "stateChange(tostring(owner), otype, 'staged', oprio, group, nil)\n"
                    + "return 1\n"
                + "end\n"
            + "end\n"
        + "end\n"
        + "if not owner and redis.call('zcard', 'q:staged:' .. group) ~= 0 then\n"
            + "local best = redis.call('zrange', 'q:staged:' .. group, 0, 0)[1]\n"
            + "redis.call('zrem', 'q:staged:' .. group, best)\n"
            + "redis.call('set', 'q:lockowners:' .. group, best)\n"
            + "local bprio = tonumber(redis.call('hget', 'q:job:' .. best, 'priority'))\n"
            + "local btype = redis.call('hget', 'q:job:' .. best, 'type')\n"
            + "stateChange(tostring(best), btype, 'inactive', bprio, group, nil)\n"
            + "return 1\n"
        + "end\n"
        + "return 0\n"
    + "end\n"
    + "stateChange = function(id, type, state, priority, group, update_by)\n"
        + "local old = redis.call('getset', 'q:job:' .. id .. ':state', state)\n"
        + "if state == old then return state end\n" // state has already changed
        + "if 'active' == state and update_by then redis.call('hset', 'q:job:' .. id, 'update_by', update_by) end\n"
        + "if 'removed' == state then redis.call('zrem', 'q:jobs', id) end\n"
        + "if old then\n"
            + "redis.call('zrem', 'q:jobs:' .. old, id)\n"
            + "redis.call('zrem', 'q:jobs:' .. type .. ':' .. old, id)\n"
        + "end\n"
        + "if ('complete' == state or 'removed' == state) and group then redis.call('zrem', 'q:staged:' .. group, id) end\n"
        + "if 'removed' ~= state then\n"
            + "redis.call('hset', 'q:job:' .. id, 'state', state)\n"
            + "redis.call('zadd', 'q:jobs', priority, id)\n"
            + "redis.call('zadd', 'q:jobs:' .. state, priority, id)\n"
            + "redis.call('zadd', 'q:jobs:' .. type .. ':' .. state, priority, id)\n"
            + "if 'inactive' == state then redis.call('lpush', 'q:' .. type .. ':jobs', 1) end\n"
            + "if 'staged' == state and group then redis.call('zadd', 'q:staged:' .. group, priority, id) end\n"
        + "end\n"
        + "if group and ('complete' == state or 'removed' == state or ('staged' == state and 'inactive' == old)) then\n"
            + "if redis.call('get', 'q:lockowners:' .. group) == id then redis.call('del', 'q:lockowners:' .. group) end\n"
        + "end\n"
        + "if acquire(id, priority, group) == 1 then return redis.call('hget', 'q:job:' .. id, 'state') end\n"
        + "return state\n"
    + "end\n"
    + "return stateChange(ARGV[1], ARGV[2], ARGV[3], ARGV[4], ARGV[5], ARGV[6])\n"
    ;

Job.prototype.state = function(state, fn) {
  var self = this;
  var client = self.client;
  var update_by = this._heartbeat ? Date.now() + this._heartbeat : null;

  self.cachedEval('stateLUA', 0, ''+self.id, self.type, state, self._priority, self._group, update_by, function(err, newstate) {
    if(err) return (fn || noop)(err);
    self._state = newstate;
    if(fn) fn();
  });

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
  var str, summary;
  
  if ('string' == typeof err) {
    str = err;
    summary = '';
  } else {
    str = err.stack || err.message || (''+err);
    summary = str.split('\n')[0];
  }

  this.set('failed_at', Date.now());
  this.set('error', str);
  this.log('%s', summary);
  return this;
};

/**
 * Set state to "complete", and progress to 100%.
 */

Job.prototype.complete = function(fn){
  this.set('updated_at', Date.now());
  return this.set('progress', 100).state('complete', fn);
};

/**
 * Set state to "failed".
 */

Job.prototype.failed = function(fn){
  return this.state('failed', fn);
};

/**
 * Set state to "inactive".
 */

Job.prototype.inactive = function(fn){
  return this.state('inactive', fn);
};

/**
 * Set state to "active".
 */

Job.prototype.active = function(fn){
  return this.state('active', fn);
};

/**
 * Set state to "staged" if this jobs of this group should be staged.
 */

Job.prototype.staged = function(fn){
	  if(!this._group)
		  return this.inactive(fn);
	  else{
		  return this.state('staged', fn);
	  }
};

/**
 * Save the job, optionally invoking the callback `fn(err)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.save = function(fn){
  var client = this.client
    , max = this._max_attempts
    , maxr = this._max_restarts
    , group = this._group
    , self = this;
  fn = fn || noop;
  
  // update
  if (this.id) return this.update(fn);

  // incr id
  client.incr('q:ids', function(err, id){
    if (err) return fn(err);
    var key = 'q:job:' + id;
    self.id = id;
    self._state = self._state || 'inactive';
    if (max) client.hset(key, 'max_attempts', max);
    if (maxr) client.hset(key, 'max_restarts', maxr);
    if (group) client.hset(key, 'group', group);
    client.sadd('q:job:types', self.type);
    self.set('type', self.type);
    self.set('created_at', Date.now());
    self.update(fn);

    // add the job for event mapping
    events.add(self);
  });

  return this;
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
  
  // Heartbeat
  if (this._heartbeat) {
	  this.set('heartbeat', this._heartbeat);
	  this.set('update_by', Date.now() + this._heartbeat);
  }

  // updated timestamp
  this.set('updated_at', Date.now());

  // priority
  this.set('priority', this._priority);

  // data
  this.set('data', json);

  // state
  this.state(this._state, function(err)
  {
      if(err) return (fn || noop)(err);

      // search data
      getSearch().index(json, this.id, fn);
  });

  return this;
};
