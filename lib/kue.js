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
    , redis = require('./redis');

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
    get: function () {
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

exports.createQueue = function ( options ) {
    if (!Queue.singleton) {
        Queue.singleton = new Queue( options );
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
    options = options || {};
    redis.configureFactory( options, this );
//    console.log( "******************** creating Kue client... " );
    this.client = Worker.client = Job.client = redis.createClient();
    this.promoter = null;
    this.workers = exports.workers;
    this.shuttingDown = false;
    Job.disableSearch = options.disableSearch;
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
    Queue.prototype.createJob = function (type, data) {
        return new Job(type, data);
    };

/**
 * Proxy to auto-subscribe to events.
 *
 * @api public
 */

var on = EventEmitter.prototype.on;
Queue.prototype.on = function (event) {
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

Queue.prototype.promote = function (ms, l) {
  var client = this.client
    , ms = ms || 5000
    , limit = l || 200;

  clearInterval(this.promoter);
  this.promoter = setInterval(function () {
    client.zrange(client.getKey('jobs:delayed_promotion'),
      0, limit-1, 'WITHSCORES', function (err, results) {
        if (err || !results.length) return;

        // iterate jobs with [id, delay, created_at]
        while (results.length && results[0] && results[1]) {
          var id = parseInt(results[0], 10)
            , promote_at = parseInt(results[1], 10)
            , promote = !Math.max(promote_at - Date.now(), 0);
          // if it's due for activity
          // "promote" the job by marking
          // it as inactive.
          if (promote) {
            Job.get(id, function (err, job) {
              if (err) return;
              events.emit(id, 'promotion');
              job.inactive();
            });
          }
          results = results.slice(2);
        }
      });
  }, ms);
};

Queue.prototype.watchStuckJobs = function (ms) {
    var client = this.client
        , ms = ms || 1000;
    var prefix = this.client.prefix;
    var script = 'local msg = redis.call( "keys", "'+prefix+':jobs:*:inactive" )\n\
        local need_fix = 0\n\
        for i,v in ipairs(msg) do\n\
          local queue = redis.call( "zcard", v )\n\
          local jt = string.match(v, "'+prefix+':jobs:(.*):inactive")\n\
          local pending = redis.call( "LLEN", "'+prefix+':" .. jt .. ":jobs" )\n\
          if queue > pending then\n\
            need_fix = need_fix + 1\n\
            for j=1,(queue-pending) do\n\
              redis.call( "lpush", "'+prefix+':"..jt..":jobs", 1 )\n\
            end\n\
          end\n\
        end\n\
        return need_fix';
    clearInterval(this.stuck_job_watch);
    client.script( "LOAD", script, function(err, sha){
        if( err ) {
            return console.error( err );
        }
        this.stuck_job_watch = setInterval(function () {
            client.evalsha( sha, 0, function(err, fixes){
                if( err ) return clearInterval( this.stuck_job_watch );
            }.bind(this));
        }.bind(this), ms );

    }.bind( this) );
};

/**
 * Get setting `name` and invoke `fn(err, res)`.
 *
 * @param {String} name
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.setting = function (name, fn) {
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

Queue.prototype.process = function (type, n, fn) {
    var self = this;

    if ('function' == typeof n) fn = n, n = 1;

    while (n--) {
        var worker = new Worker(this, type).start(fn);
        worker.id = [process.pid,type,self.workers.length+1].join('-');
        worker.on('error', function (err) {
            self.emit('error', err);
        });
        worker.on('job complete', function (job) {
            // guard against emit after shutdown
            if (self.client) {
                self.client.incrby(self.client.getKey('stats:work-time'), job.duration);
            }
        });
        // Save worker so we can access it later
        self.workers.push(worker);
    }
};

/**
 * Graceful shutdown
 *
 * @param {Function} fn callback
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.shutdown = function (fn, timeout, type) {
    var origFn = fn || function () {}
        , self = this
        , n = self.workers.length
        , type = type || '';

    if( this.shuttingDown && type === '' ) { // a global shutdown already has been called
        return fn( 'Shutdown already in progress' );
    }

    if( type === '' ) { // this is a global shutdown call
        this.shuttingDown = true;
    }

    var cleanup = function () {
        if (type == '') {
            self.client && self.client.quit();
            self.client = null;
            self.workers = [];
            exports.workers = [];
            self.removeAllListeners();
            Queue.singleton = null;
            events.unsubscribe();
            // destroy redis client and pubsub
            redis.reset();
        }
    };

    // Wrap `fn` to only call after all workers finished
    fn = function (err) {
        if (err) {
            return origFn(err);
        }
        if (!--n) {
            cleanup();
            origFn.apply(null, arguments);
        }
    };

    // shut down promoter interval
    if (type == '') {
        if( self.promoter ) {
            clearInterval( self.promoter );
            self.promoter = null;
        }
    }

    if (!self.workers.length) {
      cleanup();
      origFn();
    } else {
      // Shut down workers 1 by 1
      self.workers.forEach(function (worker) {
          if (type == '' || worker.type == type) {
              worker.shutdown(fn, timeout);
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

Queue.prototype.types = function (fn) {
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

Queue.prototype.state = function (state, fn) {
    this.client.zrange(this.client.getKey('jobs:' + state), 0, -1, fn);
    return this;
};

/**
 * Get queue work time in milliseconds and invoke `fn(err, ms)`.
 *
 * @param {Function} fn
 * @return {Queue} for chaining
 * @api public
 */

Queue.prototype.workTime = function (fn) {
    this.client.get(this.client.getKey('stats:work-time'), function (err, n) {
        if (err) return fn(err);
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

Queue.prototype.cardByType = function (type, state, fn) {
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

Queue.prototype.card = function (state, fn) {
    this.client.zcard(this.client.getKey('jobs:' + state), fn);
    return this;
};

/**
 * Completed jobs.
 */

Queue.prototype.complete = function (fn) {
    return this.state('complete', fn);
};

/**
 * Failed jobs.
 */

Queue.prototype.failed = function (fn) {
    return this.state('failed', fn);
};

/**
 * Inactive jobs (queued).
 */

Queue.prototype.inactive = function (fn) {
    return this.state('inactive', fn);
};

/**
 * Active jobs (mid-process).
 */

Queue.prototype.active = function (fn) {
    return this.state('active', fn);
};

/**
 * Delayed jobs.
 */

Queue.prototype.delayed = function (fn) {
    return this.state('delayed', fn);
};

/**
 * Completed jobs count.
 */

Queue.prototype.completeCount = function (fn) {
    return this.card('complete', fn);
};

/**
 * Failed jobs count.
 */

Queue.prototype.failedCount = function (fn) {
    return this.card('failed', fn);
};

/**
 * Inactive jobs (queued) count.
 */

Queue.prototype.inactiveCount = function (fn) {
    return this.card('inactive', fn);
};

/**
 * Active jobs (mid-process).
 */

Queue.prototype.activeCount = function (fn) {
    return this.card('active', fn);
};

/**
 * Delayed jobs.
 */

Queue.prototype.delayedCount = function (fn) {
    return this.card('delayed', fn);
};
