/**
 * Initialize a new `Job` with the given `type` and `data`.
 *
 * @param {String} type
 * @param {Object} data
 * @api public
 */

var EventEmitter = require('events').EventEmitter
  , _            = require('lodash')
  , util         = require('util')
  , noop         = function() {};

function Job( type, data, queueJob ) {
  this.type          = type;
  this.data          = data || {};
  this._max_attempts = 1;
  var queue = queueJob.queue
  this._jobEvents = queueJob.jobEvents;
  this.queue = queue;
  this.queueJob = queueJob;
  this.client = queue.redis.client();
  this.priority('normal');
  this.on('error', function( err ) {
  });// prevent uncaught exceptions on failed job errors
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
  ('active' === this.state() && this._ttl > 0)
    ?
    this.client.zadd(this.client.getKey('jobs:' + this.state()), Date.now() + parseInt(this._ttl), this.zid, noop)
    :
    noop();
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
  if(typeof str === 'string') {
    var formatted = util.format.apply(util, arguments);
  }else{
    var formatted = util.inspect(str);
  }
  this.client.rpush(this.client.getKey('job:' + this.id + ':log'), formatted, noop);
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

  // If this stringify fails because of a circular structure, even the one in events.emit would.
  // So it does not make sense to try/catch this.
  if( data ) this.set('progress_data', JSON.stringify(data));

  this.set('updated_at', Date.now());
  this.refreshTtl();
  this.queue.events.emit(this.id, 'progress', n, data);
  return this;
};

/**
 * Set the job delay in `ms`.
 *
 * @param {Number|Date} delay in ms or execution date
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

/**
 * Sets the jobEvents flag for the job.
 * Can be used to override the global self.jobEvents setting
 *
 * @param  {Boolean} events True if job events should be emitted, false if job events should not be emitted.
 * @return {Job}        Returns `this` for chaining
 */
Job.prototype.events = function (events) {
  this._jobEvents = !!events;
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

Job.prototype._getBackoffImpl = function() {
  var self = this
  var supported_backoffs = {
    fixed: function( delay ) {
      return function( attempts ) {
        return delay;
      };
    }
    , exponential: function( delay ) {
      return function( attempts ) {
        return Math.round(Math.min(
          (self._backoff.maxDelay || Infinity) - (delay * 0.5),
          delay * 0.5 * ( Math.pow(2, attempts) - 1)
        ));
      };
    }
  };
  if( _.isPlainObject(this._backoff) ) {
    return supported_backoffs[ this._backoff.type ](this._backoff.delay || this._delay);
  } else {
    return this._backoff;
  }
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
 * Increment attempts, invoking callback `fn(remaining, attempts, max)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.attempt = function( fn ) {
  var client = this.client
    , id     = this.id
    , key    = client.getKey('job:' + id);

  this._attempts = this._attempts || 0;
  if( this._attempts < this._max_attempts ) {
    client.hincrby(key, 'attempts', 1, function( err, attempts ) {
      this._attempts = attempts;
      fn(err, Math.max(0, this._max_attempts - attempts), attempts, this._max_attempts);
    }.bind(this));
  } else {
    fn(null, 0, this._attempts, this._max_attempts);
  }
  return this;
};


/**
 * Try to reattempt the job seand called onFailedAttempt, or call onFailed
 * @param remaining total left attempts
 * @param attempts
 * @param onFailedAttempt
 * @param onFailed
 * @param clbk
 */

Job.prototype.reattempt = function( attempts, clbk ) {
  clbk = clbk || noop;
  if( this.backoff() ) {
    var delay = this.delay();
    if( _.isFunction(this._getBackoffImpl()) ) {
      try {
        delay = this._getBackoffImpl().apply(this, [ attempts, delay ]);
      } catch(e) {
        clbk(e);
      }
    }
    var self = this;
    this.delay(delay).update(function( err ) {
      if( err ) return clbk(err);
      self.delayed(clbk);
    });
  } else {
    this.inactive(clbk);
  }
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
  this.error(theErr).failed(function() {
    this.attempt(function( error, remaining, attempts/*, max*/ ) {
      if( error ) {
        this.emit( 'error', error );
        return fn && fn( error );
      }
      if( remaining > 0 ) {
        this.reattempt(attempts, function( err ) {
          if( err ) {
            this.emit( 'error', err );
            return fn && fn( err );
          }
          fn && fn( err, true, attempts );
        }.bind(this));
      } else if( remaining === 0 )  {
        fn && fn( null, false, attempts );
      } else {
        fn && fn( new Error('Attempts Exceeded') );
      }
    }.bind(this));
  }.bind(this));
  return this;
};

Job.prototype.searchKeys = function( keys ) {
  if( 0 == arguments.length ) return this._searchKeys;
  this._searchKeys = keys || [];
  if( !_.isArray(this._searchKeys) ) {
    this._searchKeys = [ this._searchKeys ];
  }
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
  var client = this.client;
  var self = this
  client.multi()
    .zrem(client.getKey('jobs:' + this.state()), this.zid)
    .zrem(client.getKey('jobs:' + this.type + ':' + this.state()), this.zid)
    .zrem(client.getKey('jobs'), this.zid)
    .del(client.getKey('job:' + this.id + ':log'))
    .del(client.getKey('job:' + this.id))
    .exec(function( err ) {
//            events.remove(this);
      self.queue.events.emit(this.id, 'remove', this.type);
      if( !self.queueJob.disableSearch ) {
        self.queueJob.getSearch().remove(this.id, fn);
      } else {
        fn && fn(err);
      }
    }.bind(this));
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
  var client   = this.client
    , fn       = fn || noop;
  var oldState = this._state;
  var multi    = client.multi();
  var self = this
  if( oldState && oldState != '' && oldState != state ) {
    multi
      .zrem(client.getKey('jobs:' + oldState), this.zid)
      .zrem(client.getKey('jobs:' + this.type + ':' + oldState), this.zid);
  }
  multi
    .hset(client.getKey('job:' + this.id), 'state', state)
    .zadd(client.getKey('jobs:' + state), this._priority, this.zid)
    .zadd(client.getKey('jobs:' + this.type + ':' + state), this._priority, this.zid);

  // use promote_at as score when job moves to delayed
  ('delayed' === state) ? multi.zadd(client.getKey('jobs:' + state), parseInt(this.promote_at), this.zid) : noop();
  ('active' === state && this._ttl > 0) ? multi.zadd(client.getKey('jobs:' + state), Date.now() + parseInt(this._ttl), this.zid) : noop();
  ('active' === state && !this._ttl) ? multi.zadd(client.getKey('jobs:' + state), this._priority<0?this._priority:-this._priority, this.zid) : noop();
  ('inactive' === state) ? multi.lpush(client.getKey(this.type + ':jobs'), 1) : noop();

  this.set('updated_at', Date.now());
  this._state = state;
  multi.exec(function( err, replies ) {
    if( !err ) {
      (this._state === 'inactive') ? self.queue.events.emit(this.id, 'enqueue', this.type) : noop();
    }
    return fn(err);
  }.bind(this));
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
  this.set('error', str || '');
  this.log('%s', summary);
  this.queue.events.emit(this.id, 'error', str);
  return this;
};

/**
 * Set state to "complete", and progress to 100%.
 */

Job.prototype.complete = function( clbk ) {
  return this.set('progress', 100).state('complete', clbk);
};

/**
 * Set state to "failed".
 */

Job.prototype.failed = function( clbk ) {
  this.failed_at = Date.now();
  return this.set('failed_at', this.failed_at).state('failed', clbk);
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
  if( this.id ) return this.update(fn);

  // incr id
  client.incr(client.getKey('ids'), function( err, id ) {
    if( err ) return fn(err);
    // add the job for event mapping
    self.id = id;
    self.zid = client.createFIFO(id);
    self.subscribe(function() {
      self._state     = self._state || (this._delay ? 'delayed' : 'inactive');
      if( max ) { self.set('max_attempts', max); }
      client.sadd(client.getKey('job:types'), self.type, noop);
      self.set('type', self.type);
      var now         = Date.now();
      self.created_at = now;
      self.set('created_at', self.created_at);
      self.promote_at = now + (self._delay || 0);
      self.set('promote_at', self.promote_at);
      self.update(fn);
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
  var self = this
  // serialize json data
  try {
    json = JSON.stringify(this.data);
  } catch(err) {
    fn(err);
    return this;
  }

  // delay
  if( this._delay ) {
    this.set('delay', this._delay);
    if( this.created_at ) {
      var timestamp   = parseInt(this.failed_at || this.created_at, 10)
        , delay       = parseInt(this._delay);
      this.promote_at = timestamp + delay;
      this.set('promote_at', this.promote_at);
    }
  }
  if( this._ttl ) {
    this.set('ttl', this._ttl);
  }
  if( this._removeOnComplete ) this.set('removeOnComplete', this._removeOnComplete);
  if( this._backoff ) {
    if( _.isPlainObject(this._backoff) ) this.set('backoff', JSON.stringify(this._backoff));
    else this.set('backoff', this._backoff.toString());
  }

  // updated timestamp
  this.set('updated_at', Date.now());
  this.refreshTtl();

  // priority
  this.set('priority', this._priority);

  this.client.zadd(this.client.getKey('jobs'), this._priority, this.zid, noop);

  // data
  this.set('data', json, function() {
    // state
    this.state(this._state, fn);
  }.bind(this));

  if( !this.queue.disableSearch ) {
    if( this.searchKeys() ) {
      this.searchKeys().forEach(function( key ) {
        var value = _.get(this.data, key);
        if( !_.isString(value) ) {
          value = JSON.stringify(value);
        }
        self.queueJob.getSearch().index(value, this.id);
      }.bind(this));
    } else {
      self.queueJob.getSearch().index(json, this.id);
    }
  }
  return this;
};

/**
 * Subscribe this job for event mapping.
 *
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.subscribe = function( callback ) {
  if( this._jobEvents ) {
    this.queue.events.add(this, callback);
  } else {
    callback && callback();
  }
  return this;
};

module.exports = Job
