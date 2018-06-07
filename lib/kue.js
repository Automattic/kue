/*!
 * kue
 * Copyright (c) 2013 Automattic <behradz@gmail.com>
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , Worker       = require('./queue/worker')
  , events       = require('./queue/events')
  , Job          = require('./queue/job')
  , Warlock      = require('node-redis-warlock')
  , _            = require('lodash')
  , redis        = require('./redis')
  , noop         = function(){};

/**
 * Expose `Queue`.
 */

exports = module.exports = Queue;

/**
 * Library version.
 */

exports.version = require('../package.json').version;

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
 * Create a new `Queue`.
 *
 * @return {Queue}
 * @api public
 */

exports.createQueue = function( options ) {
  if( !Queue.singleton ) {
    Queue.singleton = new Queue(options);
  }
  events.subscribe();
  return Queue.singleton;

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

function Queue( options ) {
  options     = options || {};
  this.name   = options.name || 'kue';
  this.id = [ 'kue', require('os').hostname(), process.pid ].join(':');
  this._options   = options;
  this.promoter     = null;
  this.workers      = exports.workers;
  this.shuttingDown = false;
  Job.disableSearch = options.disableSearch !== false;
  options.jobEvents !== undefined ? Job.jobEvents = options.jobEvents : '';
  redis.configureFactory(options, this);
  this.client = Worker.client = Job.client = redis.createClient();
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
  Queue.prototype.createJob = function( type, data ) {
    return new Job(type, data);
  };

/**
 * Proxy to auto-subscribe to events.
 *
 * @api public
 */

var on             = EventEmitter.prototype.on;
Queue.prototype.on = function( event ) {
  if( 0 == event.indexOf('job') ) events.subscribe();
  return on.apply(this, arguments);
};

/**
 * Promote delayed jobs, checking every `ms`,
 * defaulting to 1 second.
 *
 * @params {Number} ms
 * @deprecated
 */

Queue.prototype.promote = function( ms, l ) {
  console.warn('promote method is deprecated, you don\'t need to call this anymore. You can safely remove it from your code now.');
};

/**
 * sets up promotion & ttl timers
 */

Queue.prototype.setupTimers = function() {
  if( this.warlock === undefined ) {
    this.lockClient = redis.createClient();
    this.warlock    = new Warlock(this.lockClient);
  }
  this.checkJobPromotion(this._options.promotion);
  this.checkActiveJobTtl(this._options.promotion);
};

/**
 * This new method is called by Kue when created
 *
 * Promote delayed jobs, checking every `ms`,
 * defaulting to 1 second.
 *
 * @params {Number} ms
 */

Queue.prototype.checkJobPromotion = function( promotionOptions ) {
  promotionOptions = promotionOptions || {};
  var client       = this.client
    , self         = this
    , timeout      = promotionOptions.interval || 1000
    , lockTtl      = promotionOptions.lockTtl || 2000
      //, lockTtl = timeout
    , limit        = promotionOptions.limit || 1000;
  clearInterval(this.promoter);
  this.promoter    = setInterval(function() {
    self.warlock.lock('promotion', lockTtl, function( err, unlock ) {
      if( err ) {
        // Something went wrong and we weren't able to set a lock
        self.emit('error', err);
        return;
      }
      if( typeof unlock === 'function' ) {
        // If the lock is set successfully by this process, an unlock function is passed to our callback.
        client.zrangebyscore(client.getKey('jobs:delayed'), 0, Date.now(), 'LIMIT', 0, limit, function( err, ids ) {
          if( err || !ids.length ) return unlock();
          //TODO do a ZREMRANGEBYRANK jobs:delayed 0 ids.length-1
          var doUnlock = _.after(ids.length, unlock);
          ids.forEach(function( id ) {
            id = client.stripFIFO(id);
            Job.get(id, function( err, job ) {
              if( err ) return doUnlock();
              events.emit(id, 'promotion');
              job.inactive(doUnlock);
            });
          });
        });
      } else {
        // The lock was not established by us, be silent
      }
    });
  }, timeout);
};


Queue.prototype.checkActiveJobTtl = function( ttlOptions ) {
  ttlOptions              = ttlOptions || {};
  var client              = this.client
    , self                = this
    , timeout             = ttlOptions.interval || 1000
    , lockTtl             = 2000
    , limit               = ttlOptions.limit || 1000;
  clearInterval(this.activeJobsTtlTimer);
  this.activeJobsTtlTimer = setInterval(function() {
    self.warlock.lock('activeJobsTTL', lockTtl, function( err, unlock ) {
      if( err ) {
        // Something went wrong and we weren't able to set a lock
        self.emit('error', err);
        return;
      }
      if( typeof unlock === 'function' ) {
        // If the lock is set successfully by this process, an unlock function is passed to our callback.
        // filter only jobs set with a ttl (timestamped) between a large number and current time
        client.zrangebyscore(client.getKey('jobs:active'), 100000, Date.now(), 'LIMIT', 0, limit, function( err, ids ) {
          if( err || !ids.length ) return unlock();

          var idsRemaining = ids.slice();
          var doUnlock = _.after(ids.length, function(){
            self.removeAllListeners( 'job ttl exceeded ack' );
            waitForAcks && clearTimeout( waitForAcks );
            unlock && unlock();
          });

          self.on( 'job ttl exceeded ack', function( id ) {
            idsRemaining.splice( idsRemaining.indexOf( id ), 1 );
            doUnlock();
          });

          var waitForAcks = setTimeout( function(){
            idsRemaining.forEach( function( id ){
              id = client.stripFIFO(id);
              Job.get(id, function( err, job ) {
                if( err ) return doUnlock();
                job.failedAttempt( { error: true, message: 'TTL exceeded' }, doUnlock );
              });
            });
          }, 1000 );

          ids.forEach(function( id ) {
            id = client.stripFIFO(id);
            events.emit(id, 'ttl exceeded');
          });
        });
      } else {
        // The lock was not established by us, be silent
      }
    });
  }, timeout);
};

/**
 * Runs a LUA script to diff inactive jobs ZSET cardinality
 * and helper pop LIST length each `ms` milliseconds and syncs helper LIST.
 *
 * @param {Number} ms interval for periodical script runs
 * @api public
 */

Queue.prototype.watchStuckJobs = function( ms ) {
  var client = this.client
    , self   = this
    , ms     = ms || 1000;
  var prefix = this.client.prefix;

  if( this.client.constructor.name == 'Redis'  || this.client.constructor.name == 'Cluster') {
    // {prefix}:jobs format is needed in using ioredis cluster to keep they keys in same node
    prefix = '{' + prefix + '}';
  }
  var script =
        'local msg = redis.call( "keys", "' + prefix + ':jobs:*:inactive" )\n\
        local need_fix = 0\n\
        for i,v in ipairs(msg) do\n\
          local queue = redis.call( "zcard", v )\n\
          local jt = string.match(v, "' + prefix + ':jobs:(.*):inactive")\n\
          local pending = redis.call( "LLEN", "' + prefix + ':" .. jt .. ":jobs" )\n\
          if queue > pending then\n\
            need_fix = need_fix + 1\n\
            for j=1,(queue-pending) do\n\
              redis.call( "lpush", "' + prefix + ':"..jt..":jobs", 1 )\n\
            end\n\
          end\n\
        end\n\
        return need_fix';
  clearInterval(this.stuck_job_watch);
  client.script('LOAD', script, function( err, sha ) {
    if( err ) {
      return self.emit('error', err);
    }
    this.stuck_job_watch = setInterval(function() {
      client.evalsha(sha, 0, function( err, fixes ) {
        if( err ) return clearInterval(this.stuck_job_watch);
      }.bind(this));
    }.bind(this), ms);

  }.bind(this));
};

/**
 * Get setting `name` and invoke `fn(err, res)`.
 *
 * @param {String} name
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.setting = function( name, fn ) {
  fn = fn || noop;
  this.client.hget(this.client.getKey('settings'), name, fn);
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

Queue.prototype.process = function( type, n, fn ) {
  var self = this;

  if( 'function' == typeof n ) fn = n, n = 1;

  while( n-- ) {
    var worker = new Worker(this, type).start(fn);
    worker.id  = [ self.id, type, self.workers.length + 1 ].join(':');
    worker.on('error', function( err ) {
      self.emit('error', err);
    });
    worker.on('job complete', function( job ) {
      // guard against emit after shutdown
      if( self.client ) {
        self.client.incrby(self.client.getKey('stats:work-time'), job.duration, noop);
      }
    });
    // Save worker so we can access it later
    self.workers.push(worker);
  }
  this.setupTimers();
};

/**
 * Graceful shutdown
 *
 * @param {Number} timeout in milliseconds to wait for workers to finish
 * @param {String} type specific worker type to shutdown
 * @param {Function} fn callback
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.shutdown = function( timeout, type, fn ) {
  var self = this
    , n    = self.workers.length;
  if( arguments.length === 1 ) {
    fn      = timeout;
    type    = '';
    timeout = null;
  } else if( arguments.length === 2 ) {
    fn   = type;
    type = '';
  }
  var origFn = fn || function() {
    };

  if( this.shuttingDown && type === '' ) { // a global shutdown already has been called
    return fn(new Error('Shutdown already in progress'));
  }

  if( type === '' ) { // this is a global shutdown call
    this.shuttingDown = true;
  }

  var cleanup = function() {
    if( self.shuttingDown ) {
      self.workers    = [];
      exports.workers = [];
      self.removeAllListeners();
      Queue.singleton = null;
      events.unsubscribe();
      // destroy redis client and pubsub
      redis.reset();
      self.client && self.client.quit();
      self.client = null;
      self.lockClient && self.lockClient.quit();
      self.lockClient = null;
    }
  };

  // Wrap `fn` to only call after all workers finished
  fn = function( err ) {
    if( err ) {
      return origFn(err);
    }
    if( !--n ) {
      cleanup();
      origFn.apply(null, arguments);
    }
  };

  // shut down promoter interval
  if( self.shuttingDown ) {
    if( self.promoter ) {
      clearInterval(self.promoter);
      self.promoter = null;
    }
    if( self.activeJobsTtlTimer ) {
      clearInterval(self.activeJobsTtlTimer);
      self.activeJobsTtlTimer = null;
    }

  }

  if( !self.workers.length ) {
    cleanup();
    origFn();
  } else {
    // Shut down workers 1 by 1
    self.workers.forEach(function( worker ) {
      if( self.shuttingDown || worker.type == type ) {
        worker.shutdown(timeout, fn);
      } else {
        fn && fn();
      }
    });
  }

  return this;
};

/**
 * Get the job types present and callback `fn(err, types)`.
 *
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.types = function( fn ) {
  fn = fn || noop;
  this.client.smembers(this.client.getKey('job:types'), fn);
  return this;
};

/**
 * Return job ids with the given `state`, and callback `fn(err, ids)`.
 *
 * @param {String} state
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.state = function( state, fn ) {
  var self = this;
  this.client.zrange(this.client.getKey('jobs:' + state), 0, -1, function(err,ids){
    var fixedIds = [];
    ids.forEach(function(id){
        fixedIds.push(self.client.stripFIFO(id));
      });
    fn(err,fixedIds);
  });
  return this;
};

/**
 * Get queue work time in milliseconds and invoke `fn(err, ms)`.
 *
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.workTime = function( fn ) {
  this.client.get(this.client.getKey('stats:work-time'), function( err, n ) {
    if( err ) return fn(err);
    fn(null, parseInt(n, 10));
  });
  return this;
};

/**
 * Get cardinality of jobs with given `state` and `type` and callback `fn(err, n)`.
 *
 * @param {String} type
 * @param {String} state
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.cardByType = function( type, state, fn ) {
  fn = fn || noop;
  this.client.zcard(this.client.getKey('jobs:' + type + ':' + state), fn);
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

Queue.prototype.card = function( state, fn ) {
  fn = fn || noop;
  this.client.zcard(this.client.getKey('jobs:' + state), fn);
  return this;
};

/**
 * Completed jobs.
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.complete = function( fn ) {
  return this.state('complete', fn);
};

/**
 * Failed jobs.
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.failed = function( fn ) {
  return this.state('failed', fn);
};

/**
 * Inactive jobs (queued).
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.inactive = function( fn ) {
  return this.state('inactive', fn);
};

/**
 * Active jobs (mid-process).
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.active = function( fn ) {
  return this.state('active', fn);
};

/**
 * Delayed jobs.
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.delayed = function( fn ) {
  return this.state('delayed', fn);
};

/**
 * Completed jobs of type `type` count.
 * @param {String} type is optional
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.completeCount = function( type, fn ) {
  if( 1 == arguments.length ) {
    fn = type;
    return this.card('complete', fn);
  }
  return this.cardByType(type, 'complete', fn);
};


/**
 * Failed jobs of type `type` count.
 * @param {String} type is optional
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.failedCount = function( type, fn ) {
  if( 1 == arguments.length ) {
    fn = type;
    return this.card('failed', fn);
  }
  return this.cardByType(type, 'failed', fn);
};

/**
 * Inactive jobs (queued) of type `type` count.
 * @param {String} type is optional
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.inactiveCount = function( type, fn ) {
  if( 1 == arguments.length ) {
    fn = type;
    return this.card('inactive', fn);
  }
  return this.cardByType(type, 'inactive', fn);
};

/**
 * Active jobs (mid-process) of type `type` count.
 * @param {String} type is optional
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.activeCount = function( type, fn ) {
  if( 1 == arguments.length ) {
    fn = type;
    return this.card('active', fn);
  }
  return this.cardByType(type, 'active', fn);
};

/**
 * Delayed jobs of type `type` count.
 * @param {String} type is optional
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.delayedCount = function( type, fn ) {
  if( 1 == arguments.length ) {
    fn = type;
    return this.card('delayed', fn);
  }
  return this.cardByType(type, 'delayed', fn);
};

/**
 * Test mode for convenience in test suites
 * @api public
 */

Queue.prototype.testMode = require('./queue/test_mode');
