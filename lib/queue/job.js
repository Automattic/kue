
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
 * Get jobs of `state`, with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
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
    if (!hash) return fn(new Error('job "' + job.id + '" doesnt exist'));
    if (!hash.type) return fn();
    // TODO: really lame, change some methods so 
    // we can just merge these
    job.type = hash.type;
    job._delay = Number(hash.delay);
    job._after = Number(hash.after);
    job._precursors = hash.precursors;
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
    , after: this._after
    , precursors: this._precursors
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
 * Get job `key`
 *
 * @param {String} key
 * @param {String} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.get = function(key, fn){
  this.client.hget('q:job:' + this.id, key, fn || noop);
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
 * Sets a job that is a precursor to this job.
 *
 * @param {Job} precursor
 * @return {Job|Number}
 * @api public
 */

Job.prototype.after = function(precursor){
  if (0 == arguments.length) return this._after;
  this._after = this.after || 0;
  this._precursors = this._precursors ? this._precursors+','+precursor.id : ''+precursor.id;
  if(this._state != 'delayed') this._state = 'waiting';	  
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
  if((this._state != 'delayed') && (this._state != 'waiting')) this._state = 'staged';
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
  this.state('removed');
  getSearch().remove(this.id);
  this.client.del('q:job:' + this.id, noop);
  this.client.del('q:job:' + this.id + ':state', noop);
  this.client.del('q:job:' + this.id + ':log', fn || noop);
  return this;
};

/**
 * Remove state and callback `fn(err)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.removeState = function(state, fn){
  if ('function' == typeof state) fn = state, state = this._state;
  if (!state) state = this._state;
  var client = this.client;
  client.zrem('q:jobs', this.id, noop);
  client.zrem('q:jobs:' + state, this.id, noop);
  client.zrem('q:jobs:' + this.type + ':' + state, this.id, noop);
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

Job.prototype.state = function(state, fn) {
  var self = this;
  var client = self.client;
  client.getset('q:job:' + self.id + ':state', state, function(err, old){
	  if(err) console.log('error: stage change could not occur', err);
	  if(err || (old == state)) return (fn||noop)(err); // we're already in the state or an error occurred
	  self.removeState(old);
	  self._state = state;
	  if ('active' == state) self.heartbeat();
	  if (('complete' == state) || ('removed' == state)) self.release();

	  if('removed' != state){
		  self.set('state', state, fn);
		  client.zadd('q:jobs', self._priority, self.id, noop);
		  client.zadd('q:jobs:' + state, self._priority, self.id, noop);
		  client.zadd('q:jobs:' + self.type + ':' + state, self._priority, self.id, noop);
		  // increase available jobs, used by Worker#getJob()
		  if ('inactive' == state) client.lpush('q:' + self.type + ':jobs', 1);	
		  if ('staged' == state){
			client.zadd('q:staged:' + self._group, self._priority, self.id, noop);
			self.acquire();
		  }
		  if ('waiting' == state){
			  self.attachAll(function(err){
				  if(err) console.log('error: attachAll failed', err);
				  if(!self._after) self.staged();
				 });
		  }
	  }
	  else if(fn)
		  fn();
  });
  return this;
};


/**
 * Attach this job to all of its precursors.  After the callback is called,
 * the _after field will have been updated with the most recent value (to
 * allow the caller to decide if the job should be moved immediately to another
 * state or not).
 *
 * @api private
 */

Job.prototype.attachAll = function(cb){
	var self = this;
	var client = self.client;

	if(!self._precursors) return;
	
	var ids = self._precursors.split(',');
	var remaining = ids.length;
	ids.forEach(function(id){
		self.attach(id, function(err){
			if(err) console.log('error: attach failed', err);
			remaining--;
			if(!remaining){
				client.hget('q:job:' + self.id, 'after', function(err, val){
					if(err) return cb(err);
					self._after = val;
					cb(err, self);
				});
			}
		});
	});
};

/**
 * Attach this job to it's precursor (given by the 'id' argument)
 *
 * @param {String} id
 * @return {Job} for chaining
 * @api private
 */

Job.prototype.attach = function(id, cb){
  var self = this;
  var client = self.client;

  // First, go ahead and add it to the dependents set for the precursor and
  // increment the id.
  client.sadd('q:after:' + id, self.id, function(err, cnt){
	  if(err || !cnt) return cb(err);
	  client.hincrby('q:job:' + self.id, 'after', 1, function(err, val){
		 if(err) return cb(err); 
		 
		 // Now, to deal with a race condition where the precursor is removed
		 // or completed while we were changing state, double check it
		 
		 client.get('q:job:' + id + ':state', function(err, state){
			 if(err) return cb(err);
			 
			 if(!state || (state == 'complete') || (state == 'removed')) {
				 // Verify the job has been removed
				 client.srem('q:after:' + id, self.id, function(err, cnt){
					 if(err || !cnt) return cb(err);
					 client.hincrby('q:job:' + self.id, 'after', -1, cb);
				 });
			 }
			 else cb();
		 });
	  });
  });
};

/**
 * Release dependents and unlock others in the serialization group if this
 * job has been deleted or has successfully completed.
 *
 * @param {String} state
 * @return {Job} for chaining
 * @api private
 */

Job.prototype.release = function(){
  var self = this;
  var client = self.client;

  // Release dependents
  client.scard('q:after:' + self.id, function(err, len) {
	if(err || !len) return;
	while(len--){
	  client.spop('q:after:' + self.id, function(err, id){
		  if(err || !id) return;
		  client.hincrby('q:job:' + id, 'after', -1, function(err, val){
			  if(err || val) return;
			  Job.get(id, function(err, job){
				if(err || !job) return;
				job.waiting();
			  });
		  });
	  });
	}
  });	

  if(!self._group) return this;

  // Make sure the job is no longer in the staging area (if being deleted)
  client.zrem('q:staged:' + self._group, self.id, noop);

  // Give lock to next job in group
  client.get('q:lockowners:' + self._group, function(err, id){
	  if(err || (id != self.id)) return;
	  client.del('q:lockowners:' + self._group, function(err){
	    if(err) return;
	    // Give the lock to someone else (since we're not in the list, we can't get it)
	    self.acquire();
	  });
  });
  
  return this;
};

/**
 * Attempt to acquire the lock for the best candidate in the group.
 * 
 *
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.acquire = function(){
  var self = this;
  var client = self.client;
  if(!self._group) return this;
  
  // Find the best candidate
  client.zrange('q:staged:' + self._group, 0, 0, function(err, groups){
	if(err || (groups.length == 0)) return;
	
	// Try and give the candidate the lock
	client.setnx('q:lockowners:' + self._group, groups[0], function(err, set){
		if(err || !set) return;
		
		// We got the lock - now give it to the candidate
		Job.get(groups[0], function(err, job){
		  if(err || !job){
			  // Bad news: couldn't give them the lock for some reason
			  // (they were probably deleted) - clean up and try again
			  
			  client.zrem('q:staged:' + self._group, groups[0], function(){
				  client.del('q:lockowners:' + self._group, function(err){
				    if(err) return;
					self.acquire();
				  });				  
			  });
			  
			  return;
		  }
		  
		  // The job now has the lock
		  client.zrem('q:staged:' + job._group, job.id, noop);
		  job.inactive();
		});
	});
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
    str = err.stack || err.message;
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

Job.prototype.complete = function(){
  this.set('updated_at', Date.now());
  return this.set('progress', 100).state('complete');
};

/**
 * Set state to "failed".
 */

Job.prototype.failed = function(){
  return this.state('failed');
};

/**
 * Set state to "inactive".
 */

Job.prototype.inactive = function(){
  return this.state('inactive');
};

/**
 * Set state to "active".
 */

Job.prototype.active = function(){
  return this.state('active');
};

/**
 * Set state to "waiting" if this job has any dependents
 * left to fire.
 */

Job.prototype.waiting = function(){
  if(!this._after)
	  return this.staged();
  else{
	  return this.state('waiting');
  }
};

/**
 * Set state to "staged" if this jobs of this group should be staged.
 */

Job.prototype.staged = function(){
	  if(!this._group)
		  return this.inactive();
	  else{
		  return this.state('staged');
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
    , pre = this._precursors
    , after = this._after
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
    if (pre) client.hset(key, 'precursors', pre);
    if (after) client.hset(key, 'after', after);
    if (group) client.hset(key, 'group', group);
    client.sadd('q:job:types', self.type);
    self.set('type', self.type);
    self.set('created_at', Date.now());
    self.update(fn);

    // add the job for event mapping
    self.subscribe();
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
  this.state(this._state);

  // search data
  getSearch().index(json, this.id, fn);
  
  return this;
};

/**
 * Subscribe this job for event mapping.
 *
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.subscribe = function(){
  events.add(this);
  return this;
};
