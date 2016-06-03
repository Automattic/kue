/*!
 * kue - Job
 * 
 * Copyright (c) 2016 Automattic <behradz@gmail.com>
 * Copyright (c) 2013 Automattic <behradz@gmail.com>
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */
var EventEmitter = require('events').EventEmitter
  , events       = require('./events')
  , redis        = require('../redis')
  , _            = require('lodash')
  , util         = require('util')
  , noop         = function() {
};


/**
 * Expose `Job`.
 */
exports = module.exports = Job;


exports.jobEvents = true;


/**
 * Default job priority map.
 */
var priorities = exports.priorities = {
  low: 10,
  normal: 0,
  medium: -5,
  high: -10,
  critical: -15
};


/**
 * Get job with `id` and callback `fn(err, job)`.
 *
 * @param {Number} id
 * @param {String} jobType is optional
 * @param {Function} fn
 * @api public
 */
exports.get = function( id, fn ) {
  var client = redis.client()
    , job    = new Job;

  job.id = id;
  job.zid = client.createFIFO(id);
  client.hgetall(client.getKey('job:' + job.id), function( err, hash ) {
    if( err ) {
      return fn(err);
    }
    if( _.isEmpty(hash) ) {
      return fn(new Error('job "' + job.id + '" doesn\'t exist'));
    }
    if( !hash.type ) {
      return fn(new Error('job "' + job.id + '" is invalid'))
    }
    // TODO: really lame, change some methods so
    // we can just merge these
    job.type              = hash.type;
    job._ttl              = hash.ttl;
    job._delay            = hash.delay;
    job.priority(Number(hash.priority));
    job._progress         = hash.progress;
    job._attempts         = Number(hash.attempts);
    job._max_attempts     = Number(hash.max_attempts);
    job._state            = hash.state;
    job._error            = hash.error;
    job.created_at        = hash.created_at;
    job.promote_at        = hash.promote_at;
    job.updated_at        = hash.updated_at;
    job.failed_at         = hash.failed_at;
    job.started_at        = hash.started_at;
    job.duration          = hash.duration;
    job.workerId          = hash.workerId;
    job._removeOnComplete = hash.removeOnComplete;
    try {
      if( hash.data ) job.data = JSON.parse(hash.data);
      if( hash.result ) job.result = JSON.parse(hash.result);
      if( hash.progress_data ) job.progress_data = JSON.parse(hash.progress_data);
      if( hash.backoff ) {
        var source = 'job._backoff = ' + hash.backoff + ';';
        eval(source);
      }
    } catch(e) {
      err = e;
    }
    fn(err, job);
  });
};


/**
 * Remove job `id` if it exists and invoke callback `fn(err)`.
 *
 * @param {Number} id
 * @param {Function} fn
 * @api public
 */
exports.remove = function( id, fn ) {
  fn = fn || noop;
  var client = redis.client();
  var zid = client.createFIFO(id);
  client
    .removeJob(client.prefix, id, zid)
    .then(function(){
      events.emit(id, 'remove');
      fn && fn();
    })
    .catch(fn);
};


/**
 * Get log for job `id` and callback `fn(err, log)`.
 *
 * @param {Number} id
 * @param {Function} fn
 * @api public
 */
exports.log = function( id, fn ) {
  Job.client.lrange(Job.client.getKey('job:' + id + ':log'), 0, -1, fn);
};


/**
 * Initialize a new `Job` with the given `type` and `data`.
 *
 * @param {String} type
 * @param {Object} data
 * @api public
 */
function Job( type, data ) {
  this.type          = type;
  this.data          = data || {};
  this._max_attempts = 1;
  this.client = Job.client/* || (Job.client = redis.client())*/;
  this.priority('normal');
  //prevent uncaught exceptions on failed job errors
  this.on('error', noop);
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
Job.prototype.toJSON = function() {
  return {
    id: this.id
    , type: this.type
    , data: this.data
    , result: this.result
    , priority: this._priority
    , progress: this._progress || 0
    , progress_data: this.progress_data
    , state: this._state
    , error: this._error
    , created_at: this.created_at
    , promote_at: this.promote_at
    , updated_at: this.updated_at
    , failed_at: this.failed_at
    , started_at: this.started_at
    , duration: this.duration
    , delay: this._delay
    , workerId: this.workerId
    , ttl: this._ttl
    , attempts: {
      made: Number(this._attempts) || 0
      , remaining: this._attempts > 0 ? this._max_attempts - this._attempts : Number(this._max_attempts) || 1
      , max: Number(this._max_attempts) || 1
    }
  };
};


Job.prototype.refreshTtl = function() {
  var client = this.client;
  var prio = Date.now() + parseInt(this._ttl);
  ('active' === this._state && this._ttl > 0)
    ? client.zadd(client.getKey('jobs:' + this._state), prio, this.zid)
    : noop();
};


/**
 * Log `str` with sprintf-style variable args or anything (objects,arrays,numbers,etc).
 *
 * Examples:
 *
 *    job.log('preparing attachments');
 *    job.log('sending email to %s at %s', user.name, user.email);
 *    job.log({key: 'some key', value: 10});
 *    job.log([1,2,3]);
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
Job.prototype.log = function( str ) {
  var formatted = util.inspect(str);
  if(typeof str === 'string') {
    formatted = util.format.apply(util, arguments);
  }
  this.client.rpush(this.client.getKey('job:' + this.id + ':log'), formatted);
  this.set('updated_at', Date.now());
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
Job.prototype.set = function( key, val, fn ) {
  this.client.hset(this.client.getKey('job:' + this.id), key, val, fn || noop);
  return this;
};


/**
 * Get job `key`
 *
 * @param {String} key
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */
Job.prototype.get = function( key, fn ) {
  this.client.hget(this.client.getKey('job:' + this.id), key, fn || noop);
  return this;
};


/**
 * Set the job progress by telling the job
 * how `complete` it is relative to `total`.
 * data can be used to pass extra data to job subscribers
 *
 * @param {Number} complete
 * @param {Number} total
 * @param {Object} data
 * @return {Job} for chaining
 * @api public
 */
Job.prototype.progress = function( complete, total, data ) {
  if( 0 == arguments.length ) return this._progress;

  var n = Math.min(100, complete * 100 / total | 0);
  this.set('progress', n);
  this.set('updated_at', Date.now());
  this.refreshTtl();

  // If this stringify fails because of a circular structure,
  // even the one in events.emit would.
  // So it does not make sense to try/catch this.
  if( data ) {
    this.set('progress_data', JSON.stringify(data));
  }

  events.emit(this.id, 'progress', n, data);

  return this;
};


/**
 * Set the job delay in `ms`.
 *
 * @param {Number|Date} ms delay in ms or execution date
 * @return {Job|Number}
 * @api public
 */
Job.prototype.delay = function( ms ) {
  if( 0 == arguments.length ) return this._delay;
  if( _.isDate(ms) ) {
    ms = parseInt(ms.getTime() - Date.now())
  }
  if( ms > 0 ) {
    this._delay = ms;
  }
  return this;
};


Job.prototype.removeOnComplete = function( param ) {
  if( 0 == arguments.length ) return this._removeOnComplete;
  this._removeOnComplete = param;
  return this;
};


Job.prototype.backoff = function( param ) {
  if( 0 == arguments.length ) return this._backoff;
  this._backoff = param;
  return this;
};


/**
 *
 * @param param
 * @returns {*}
 */
Job.prototype.ttl = function( param ) {
  if( 0 == arguments.length ) return this._ttl;
  if( param > 0 ) {
    this._ttl = param;
  }
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
Job.prototype.priority = function( level ) {
  if( 0 == arguments.length ) return this._priority;
  this._priority = null == priorities[ level ]
    ? level
    : priorities[ level ];
  return this;
};


/**
 * Set max attempts to `n`.
 *
 * @param {Number} n
 * @return {Job} for chaining
 * @api public
 */
Job.prototype.attempts = function( n ) {
  this._max_attempts = n;
  return this;
};


Job.prototype.failedAttempt = function( theErr, fn ) {
  this
    .error(theErr)
    .failed(function(error, remaining, attempts) {
      if( error ) {
        this.emit( 'error', error );
        return fn && fn( error );
      }
      if( remaining > 0 ) {
        fn && fn( null, true, attempts );
      } else {
        fn && fn( null, false, attempts );
      }
    }.bind(this));

  return this;
};


/**
 * Remove the job and callback `fn(err)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */
Job.prototype.remove = function( fn ) {
  Job.remove(this.id, fn);
  return this;
};


/**
 * Set state to `state`.
 *
 * @param {String} state
 * @param fn
 * @return {Job} for chaining
 * @api public
 */
Job.prototype.state = function( state, fn ) {
  if( 0 == arguments.length ) return this._state;

  fn = fn || noop;
  this.client
    .setState(this.client.prefix, this.id, this.zid, state, Date.now())
    .then(function(remaining, attempts, max){
      this._state = state;
      (this._state === 'inactive') ? events.emit(this.id, 'enqueue', this.type) : noop();
      fn(null, remaining, attempts, max);
    }.bind(this))
    .catch(fn);

  return this;
};


/**
 * Set the job's failure `err`.
 *
 * @param {Error} err
 * @return {Job} for chaining
 * @api public
 */
Job.prototype.error = function( err ) {
  var str, summary;
  if( 0 == arguments.length ) return this._error;

  if( 'string' == typeof err ) {
    str     = err;
    summary = '';
  } else {
    if( err.stack && 'string' === typeof err.stack ) {
      str = err.stack
    } else { //TODO what happens to CallSite[] err.stack?
      str = err.message
    }
    summary = ('string' === typeof str) ? str.split('\n')[ 0 ] : '';
  }
  this.set('error', str);
  this.log('%s', summary);
  events.emit(this.id, 'error', str);
  return this;
};


/**
 * Set state to "complete", and progress to 100%.
 */
Job.prototype.complete = function( clbk ) {
  return this.state('complete', clbk);
};


/**
 * Set state to "failed".
 */
Job.prototype.failed = function( clbk ) {
  return this.state('failed', clbk);
};


/**
 * Set state to "inactive".
 */
Job.prototype.inactive = function( clbk ) {
  return this.state('inactive', clbk);
};


/**
 * Set state to "active".
 */
Job.prototype.active = function( clbk ) {
  return this.state('active', clbk);
};


/**
 * Set state to "delayed".
 */
Job.prototype.delayed = function( clbk ) {
  return this.state('delayed', clbk);
};


/**
 * Save the job, optionally invoking the callback `fn(err)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */
Job.prototype.save = function( fn ) {
  var client = this.client
    , fn     = fn || noop
    , max    = this._max_attempts
    , self   = this;

  // update
  if( this.id ) {
    return this.update(fn);
  }

  // incr id
  client.incr(client.getKey('ids'), function( err, id ) {
    if( err ) {
      return fn(err);
    }

    // add the job for event mapping
    var key = client.getKey('job:' + id);
    self.id = id;
    self.zid = client.createFIFO(id);
    self.subscribe(function() {
      var multi = client.multi();
      self._state     = self._state || (this._delay ? 'delayed' : 'inactive');
      if( max ) {
        multi.hset(key, 'max_attempts', max);
      }
      multi.sadd(client.getKey('job:types'), self.type);
      multi.hset(key, 'type', self.type);
      var now = Date.now();
      self.created_at = now;
      multi.hset(key, 'created_at', self.created_at);
      self.promote_at = now + (self._delay || 0);
      multi.hset(key, 'promote_at', self.promote_at);
      multi
        .exec()
        .then(function(){
          self.update(fn);
        });
    }.bind(this));
  }.bind(this));

  return this;
};


/**
 * Update the job and callback `fn(err)`.
 *
 * @param {Function} fn
 * @api public
 */
Job.prototype.update = function( fn ) {
  var json;

  // serialize json data
  try {
    json = JSON.stringify(this.data);
  } catch(err) {
    fn(err);
    return this;
  }

  var multi = this.client.multi();
  var jobKey = this.client.getKey('job:' + this.id);

  // delay
  if( this._delay ) {
    multi.hset(jobKey, 'delay', this._delay);
    if( this.created_at ) {
      var timestamp   = parseInt(this.failed_at || this.created_at, 10)
        , delay       = parseInt(this._delay);
      this.promote_at = timestamp + delay;
      multi.hset(jobKey, 'promote_at', this.promote_at);
    }
  }
  if( this._ttl ) {
    multi.hset(jobKey, 'ttl', this._ttl);
  }
  if( this._removeOnComplete ) {
    multi.hset(jobKey, 'removeOnComplete', this._removeOnComplete);
  }
  if( this._backoff ) {
    if( _.isPlainObject(this._backoff) ) {
      multi.hset(jobKey, 'backoff', JSON.stringify(this._backoff));
    } else {
      multi.hset(jobKey, 'backoff', this._backoff.toString());
    }
  }

  // update timestamp
  multi.hset(jobKey, 'updated_at', Date.now());

  // priority
  multi.hset(jobKey, 'priority', this._priority);

  // update priority
  multi.zadd(this.client.getKey('jobs'), this._priority, this.zid);

  // update data
  multi.hset(jobKey, 'data', json);

  multi
    .exec()
    .then(function(){
      this.state(this._state, fn);
      this.refreshTtl();
    }.bind(this));

  return this;
};


/**
 * Subscribe this job for event mapping.
 *
 * @return {Job} for chaining
 * @api public
 */
Job.prototype.subscribe = function( callback ) {
  if( exports.jobEvents ) {
    events.add(this, callback);
  } else {
    callback && callback();
  }
  return this;
};
