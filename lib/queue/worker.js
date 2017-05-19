/*!
 * kue - Worker
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
  , redis        = require('../redis')
  , events       = require('./events')
  , Job          = require('./job')
  , retimer      = require('retimer')
  , noop         = function() {
};


/**
 * Expose `Worker`.
 */
module.exports = Worker;


/**
 * Redis connections used by `getJob` when blocking.
 */
var clients = {};


/**
 * Initialize a new `Worker` with the given Queue
 * targetting jobs of `type`.
 *
 * @param {Queue} queue
 * @param {String} type
 * @api private
 */
function Worker( queue, type ) {
  this.queue   = queue;
  this.type    = type;
  this.client  = Worker.client || (Worker.client = redis.createClient());
  this.running = true;
  this.job     = null;
}


/**
 * Inherit from `EventEmitter.prototype`.
 */
Worker.prototype.__proto__ = EventEmitter.prototype;


/**
 * Start processing jobs with the given `fn`,
 *
 * @param {Function} fn
 * @return {Worker} for chaining
 * @api private
 */
Worker.prototype.start = function( fn ) {
  var self = this;
  self.idle();

  if( !self.running )
    return this;

  self.getJob(function( err, job ) {
    if( err ) {
      self.error(err, job);
    }
    if( !job || err ) {
      setImmediate(function() {
        self.start(fn);
      });
      return;
    }
    self.process(job, fn);
  });
  return this;
};


/**
 * Error handler, currently does nothing.
 *
 * @param {Error} err
 * @param {Job} job
 * @return {Worker} for chaining
 * @api private
 */
Worker.prototype.error = function( err, job ) {
  this.emit('error', err, job);
  return this;
};


/**
 * Process a failed `job`. Set's the job's state
 * to "failed" unless more attempts remain, in which
 * case the job is marked as "inactive" or "delayed"
 * and remains in the queue.
 *
 * @param {Job} job
 * @param {Object} theErr
 * @param {Function} fn
 * @return {Worker} for chaining
 * @api private
 */
Worker.prototype.failed = function( job, theErr, fn ) {
  var self = this;
  job.failedAttempt( theErr, function( err, hasAttempts, attempt ) {
    if( err ) return self.error(err, job);
    if( hasAttempts ) {
      self.emitJobEvent('failed attempt', job, theErr.message || theErr.toString(), attempt );
    } else {
      self.emitJobEvent('failed', job, theErr.message || theErr.toString() );
    }
    fn && self.start(fn);
  });
  return this;
};


/**
 * Process `job`, marking it as active,
 * invoking the given callback `fn(job)`,
 * if the job fails `Worker#failed()` is invoked,
 * otherwise the job is marked as "complete".
 *
 * @param {Job} job
 * @param {Function} fn
 * @return {Worker} for chaining
 * @api public
 */
Worker.prototype.process = function( job, fn ) {
  var self  = this
    , start = new Date();

  this.job = job;
  this.timer = retimer(this.heartbeat.bind(this), 10000);
  /*
  store job.id around given done to the caller,
  so that we can later match against it when done is called
   */
  var createDoneCallback = function( jobId ) {
    return function( err, result ) {
      self.timer.clear();

      if( self.drop_user_callbacks ) {
        // worker is shutting down!
        return;
      }
      if( self.job === null || self.job.id !== jobId ) {
        /*
         if no job in hand, or the current job in hand
         doesn't match called done callback's jobId
         then ignore running callers done.
         */
        return;
      }

      if( err ) {
        return self.failed(job, err, fn);
      }

      job.set('duration', job.duration = new Date - start, noop);
      if( result ) {
        try {
          job.result = result;
          job.set('result', JSON.stringify(result), noop);
        } catch(e) {
          job.set('result', JSON.stringify({ error: true, message: 'Invalid JSON Result: "' + result + '"' }), noop);
        }
      }

      job.complete(function() {
        if( job.removeOnComplete() ) {
          job.remove();
        }
        self.emitJobEvent('complete', job, result);
        self.start(fn);
      }.bind(this));
    };
  };

  var doneCallback = createDoneCallback( job.id );

  var workerCtx = {
    /**
     * @pause: let the processor to tell worker not to continue processing new jobs
     */
    pause: function( timeout, fn ) {
      if( arguments.length === 1 ) {
        fn      = timeout;
        timeout = 5000;
      }
      self.queue.shutdown(Number(timeout), self.type, fn);
    },
    /**
     * @resume: let the processor to trigger restart for they job processing
     */
    resume: function() {
      if( self.resume() ) {
        self.start(fn);
      }
    }
  };

  self.emitJobEvent('start', job, job.type);

  if( fn.length === 2 ) {
    // user provided a two argument function,
    // doesn't need workerCtx
    fn(job, doneCallback);
  } else {
    // user wants workerCtx parameter,
    // make done callback the last
    fn(job, workerCtx, doneCallback);
  }

  return this;
};


/**
 * Atomic ZPOP implementation.
 *
 * @param {Function} fn
 * @api private
 */
Worker.prototype.zpop = function( fn ) {
  this.client.zpop(
    this.client.prefix,
    this.type,
    Date.now(),
    this.id
  )
    .then(function(id){
      if( id[0] ) {
        fn(null, this.client.stripFIFO(id[0]));
        return;
      }
      fn();
    }.bind(this))
    .catch(fn);
};


/**
 * Attempt to fetch the next job.
 *
 * @param {Function} fn
 * @api private
 */
Worker.prototype.getJob = function( fn ) {
  var self = this;
  if( !self.running ) {
    return fn('Already Shutdown');
  }
  // alloc a client for this job type
  var client = clients[ self.type ] || (clients[ self.type ] = redis.createClient());
  client.blpop(client.getKey(self.type + ':jobs'), 0, function( err ) {
    if( err || !self.running ) {
      return fn(err);
    }
    self.job = true;
    self.zpop(function( err, id ) {
      if( err || !id ) {
        self.idle();
        return fn(err);
      }
      Job.get(id, fn);
    });
  });
};


Worker.prototype.heartbeat = function() {
  if( this.job && this.job.id ) {
    this.client.zadd(this.client.getKey('jobs:active'), Date.now(), this.job.zid);
    this.timer = retimer(this.heartbeat.bind(this), 10000);
  }
};


/**
 * emits worker idle event and nullifies current job in hand
 */
Worker.prototype.idle = function() {
  this.job = null;
  this.emit('idle');
  return this;
};


/**
 * Gracefully shut down the worker
 *
 * @param {Function} fn
 * @param {int} timeout
 * @api private
 */
Worker.prototype.shutdown = function( timeout, fn ) {
  var self = this, shutdownTimer = null;
  if( arguments.length === 1 ) {
    fn      = timeout;
    timeout = null;
  }

  var _fn = function( job ) {
    if( job && self.job && job.id !== self.job.id ) {
      // simply ignore older job events currently
      // being received until the right one comes...
      return;
    }
    shutdownTimer && clearTimeout(shutdownTimer);
    self.removeAllListeners();
    self.job = null;
    (self.type in clients) && clients[ self.type ].quit();
    delete clients[ self.type ];
    self.cleaned_up = true;
    fn();
  };

  if( !this.running )
    return _fn();

  this.running = false;

  if( !this.job ) {
    // As soon as we're free, signal that we're done
    return _fn();
  }

  this.on('idle', _fn);
  this.on('job complete', _fn);
  this.on('job failed', _fn);
  this.on('job failed attempt', _fn);

  if( timeout ) {
    shutdownTimer = setTimeout(function() {
      // shutdown timeout reached...
      if( self.job ) {
        self.drop_user_callbacks = true;
        self.removeAllListeners();
        if( self.job === true ) {
          self.once('idle', _fn);
        } else {
          // a job is running, fail it and call _fn when failed
          self.once('job failed', _fn);
          self.once('job failed attempt', _fn);
          self.failed(self.job, { error: true, message: 'Shutdown' }, noop);
        }
      } else {
        // no job running, just finish immediately
        _fn();
      }
    }.bind(this), timeout);
  }
};


Worker.prototype.emitJobEvent = function( event, job, arg1, arg2 ) {
  if( this.cleaned_up )
    return;
  
  events.emit(job.id, event, arg1, arg2);
  this.emit('job ' + event, job);
};


Worker.prototype.resume = function() {
  if( this.running )
    return false;

  this.cleaned_up          = false;
  this.drop_user_callbacks = false;
  this.running             = true;
  return true;
};