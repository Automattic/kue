/*!
 * kue - Queue
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
  , Worker       = require('./queue/worker')
  , events       = require('./queue/events')
  , Job          = require('./queue/job')
  , Redlock      = require('redlock')
  , _            = require('lodash')
  , redis        = require('./redis');


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
  this.id = [ this.name, require('os').hostname(), process.pid ].join(':');
  this._options     = options;
  this.promoter     = null;
  this.workers      = exports.workers;
  this.shuttingDown = false;
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


var on = EventEmitter.prototype.on;


/**
 * Proxy to auto-subscribe to events.
 *
 * @api public
 */
Queue.prototype.on = function( event ) {
  if( 0 == event.indexOf('job') ) {
    events.subscribe();
  }
  return on.apply(this, arguments);
};


/**
 * sets up promotion & ttl timers
 */
Queue.prototype.setupTimers = function() {
  if( this.redlock === undefined ) {
    // this.lockClient = redis.createClient();
    this.redlock    = new Redlock(
      [this.client],
      {
        driftFactor: 0.01,
        retryCount: 0,
        retryDelay: 500
      }
    );
  }
  this.checkJobPromotion(this._options.promotion);
  this.checkStalledJobs(this._options.promotion);
};


/**
 * This new method is called by Kue when created
 *
 * Promote delayed jobs, checking every `ms`,
 * defaulting to 5 seconds.
 *
 * @params {Number} ms
 */
Queue.prototype.checkJobPromotion = function( promotionOptions ) {
  promotionOptions = promotionOptions || {};
  var client       = this.client
    , self         = this
    , timeout      = promotionOptions.interval || 1000
    , lockTtl      = 2000
    , limit        = promotionOptions.limit || 1000;

  clearInterval(this.promoter);

  this.promoter = setInterval(function() {
    self.redlock
      .lock('promotionLock', lockTtl)
      .then(function( lock ) {
        client.zrangebyscore(client.getKey('jobs:delayed'), 0, Date.now(), 'LIMIT', 0, limit, function( err, ids ) {
          if( err || !ids.length ) {
            return lock.unlock();
          }
          var doUnlock = _.after(ids.length, function(){lock.unlock()});
          ids.forEach(function( id ) {
            id = client.stripFIFO(id);
            Job.get(id, function( err, job ) {
              if( err ) {
                return doUnlock();
              }
              events.emit(id, 'promotion');
              job.inactive(doUnlock);
            });
          });
        });
      })
      .catch(function(){});
  }, timeout);
};


Queue.prototype.checkStalledJobs = function( options ) {
  options                 = options || {};
  var client              = this.client
    , self                = this
    , timeout             = options.interval || 10000
    , lockTtl             = 2000
    , limit               = options.limit || 1000;

  clearInterval(this.stalledJobsTimer);

  this.stalledJobsTimer = setInterval(function() {
    self.redlock
      .lock('stalledJobsLock', lockTtl )
      .then(function(lock) {
        // filter only jobs set with a ttl (timestamped)
        // between a large number and current time
        var then = Date.now() - (15*1000);
        client.zrangebyscore(client.getKey('jobs:active'), 0, then, 'LIMIT', 0, limit,
          function( err, ids ) {
            if( err || !ids.length ) {
              return lock.unlock();
            }
            var idsRemaining = ids.slice();
            var doUnlock = _.after(ids.length, function(){
              lock.unlock();
            });
            idsRemaining.forEach( function( id ){
              id = client.stripFIFO(id);
              Job.get(id, function( err, job ) {
                if( err ) {
                  return doUnlock();
                }
                job.failedAttempt({ error: true, message: 'stalled' }, function(){
                  events.emit(job.id, 'stalled');
                  doUnlock();
                });
              });
            });
        });
      })
      .catch(function(){});
  }, timeout);
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

  if( 'function' === typeof n ) {
    fn = n;
    n = 1;
  }

  while( n-- ) {
    var worker = new Worker(this, type);
    worker.id  = [ self.id, type, self.workers.length + 1 ].join(':');
    worker.on('error', function( err ) {
      self.emit('error', err);
    });
    worker.on('job complete', function( job ) {
      if( self.client ) {
        self.client.incrby(self.client.getKey('stats:work-time'), job.duration);
      }
    });
    self.workers.push(worker);
    worker.start(fn);
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

  var origFn = fn || function() {};

  if( this.shuttingDown && type === '' ) {
    // a global shutdown already has been called
    return fn(new Error('Shutdown already in progress'));
  }

  if( type === '' ) {
    // this is a global shutdown call
    this.shuttingDown = true;
  }

  var cleanup = function() {
    if( self.shuttingDown ) {
      self.workers    = [];
      exports.workers = [];
      self.removeAllListeners();
      events.unsubscribe();
      redis.reset();
      self.client && self.client.quit();
      self.client = null;
      // self.lockClient && self.lockClient.quit();
      // self.lockClient = null;
      Queue.singleton = null;
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
    if( self.stalledJobsTimer ) {
      clearInterval(self.stalledJobsTimer);
      self.stalledJobsTimer = null;
    }

  }

  if( !self.workers.length ) {
    cleanup();
    origFn();
  } else {
    // Shut down workers 1 by 1
    self.workers.forEach(function( worker ) {
      if( self.shuttingDown || worker.type == type ) {
        //TODO worker.removeAllListeners()?
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
  this.client.smembers(this.client.getKey('job:types'), fn);
  return this;
};


/**
 * Return job ids with the given `state`, and callback `fn(err, ids)`.
 *
 * @param {String} state
 * @param {Number} offset
 * @param {Number} limit
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */
Queue.prototype.state = function( state, offset, limit, fn ) {
  if( !fn && !limit ) {
    fn = offset;
    offset = 0;
    limit = -1;
  }
  var self = this;
  this.client.zrevrange(
    this.client.getKey('jobs:' + state),
    offset,
    limit,
    function(err, ids){
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
 * Get with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */
Queue.prototype.range = function( from, to, order, fn ) {
  this.client.zrevrange(this.client.getKey('jobs'), from, to, get(this.client, order, fn));
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
Queue.prototype.rangeByState = function( state, from, to, order, fn ) {
  this.client.zrevrange(this.client.getKey('jobs:' + state), from, to, get(this.client, order, fn));
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
Queue.prototype.rangeByType = function( type, state, from, to, order, fn ) {
  this.client.zrevrange(this.client.getKey('jobs:' + type + ':' + state), from, to, get(this.client, order, fn));
};


/**
 * Return a function that handles fetching
 * of jobs by the ids fetched.
 *
 * @param {Object} client
 * @param {String} order
 * @param {Function} fn
 * @return {Function}
 * @api private
 */
function get(client, order, fn) {
  return function( err, ids ) {
    if( err ) return fn(err);
    var pending = ids.length
      , jobs    = {};
    if( !pending ) return fn(null, ids);
    ids.forEach(function( id ) {
      // turn zid back to regular job id
      id = client.stripFIFO(id);
      Job.get(id, function( err, job ) {
        if( err ) {
          console.error(err);
        } else {
          jobs[ redis.client().createFIFO(job.id) ] = job;
        }
        --pending || fn(null, 'desc' == order
          ? map(jobs, ids).reverse()
          : map(jobs, ids));
      });
    });
  }
}


/**
 * Map `jobs` by the given array of `ids`.
 *
 * @param {Object} jobs
 * @param {Array} ids
 * @return {Array}
 * @api private
 */
function map( jobs, ids ) {
  var ret = [];
  ids.forEach(function( id ) {
    if( jobs[ id ] ) ret.push(jobs[ id ]);
  });
  ret = ret.sort(function( a, b ) {
    return parseInt(a.id) - parseInt(b.id);
  });
  return ret;
}


/**
 * Test mode for convenience in test suites
 * @api public
 */
Queue.prototype.testMode = require('./queue/test_mode');