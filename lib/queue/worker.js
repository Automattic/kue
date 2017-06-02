/*!
 * kue - Worker
 * Copyright (c) 2013 Automattic <behradz@gmail.com>
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 * Author: behradz@gmail.com
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , redis        = require('../redis')
  , events       = require('./events')
  , Job          = require('./job')
  , noop         = function() {};

/**
 * Expose `Worker`.
 */

module.exports = Worker;

/**
 * Redis connections used by `getJob()` when blocking.
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
  if( !self.running ) return;

  if (self.ttlExceededCb)
    self.queue.removeListener('job ttl exceeded', self.ttlExceededCb);

  self.ttlExceededCb = function(id) {
    if( self.job && self.job.id && self.job.id === id ) {
      self.failed( self.job, { error: true, message: 'TTL exceeded' }, fn );
      events.emit(id, 'ttl exceeded ack');
    }
  }

  /*
   listen if current job ttl received,
   so that this worker can fail current stuck job and continue,
   in case user's process callback is stuck and done is not called in time
   */
  this.queue.on( 'job ttl exceeded', self.ttlExceededCb);

  self.getJob(function( err, job ) {
    if( err ) self.error(err, job);
    if( !job || err ) return process.nextTick(function() {
      self.start(fn);
    });
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
      self.emitJobEvent( 'failed attempt', job, theErr.message || theErr.toString(), attempt );
    } else {
      self.emitJobEvent( 'failed', job, theErr.message || theErr.toString() );
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
  job.set( 'started_at', job.started_at = start.getTime() );
  job.set( 'workerId', job.workerId = this.id );
  /*
  store job.id around given done to the caller,
  so that we can later match against it when done is called
   */
  var createDoneCallback = function( jobId ) {
    return function( err, result ) {
      if( self.drop_user_callbacks ) {
        //console.warn( 'Worker started to shutdown, ignoring execution of done callback' );
        //job.log( 'Worker started to shutdown, ignoring execution of done callback' );
        return;
      }
      /*
      if no job in hand, or the current job in hand
      doesn't match called done callback's jobId
      then ignore running callers done.
       */
      if( self.job === null || self.job && self.job.id && self.job.id !== jobId ) {
        //console.warn( 'This job has already been finished, ignoring execution of done callback' );
        //job.log( 'This job has already been finished, ignoring execution of done callback' );
        return;
      }
      if( err ) {
        return self.failed(job, err, fn);
      }
      job.set('duration', job.duration = new Date - start);
      if( result ) {
        try {
          job.result = result;
          job.set('result', JSON.stringify(result), noop);
        } catch(e) {
          job.set('result', JSON.stringify({ error: true, message: 'Invalid JSON Result: "' + result + '"' }), noop);
        }
      }
      job.complete(function() {
        job.attempt(function() {
          if( job.removeOnComplete() ) {
            job.remove();
          }
          self.emitJobEvent('complete', job, result);
          self.start(fn);
        });
      }.bind(this));
    };
  };

  var doneCallback = createDoneCallback( job.id );

  var workerCtx    = {
    /**
     * @author behrad
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
     * @author behrad
     * @pause: let the processor to trigger restart for they job processing
     */
    resume: function() {
      if( self.resume() ) {
        self.start(fn);
      }
    },
    shutdown: function() {
      self.shutdown();
    }
  };

  job.active(function() {
    self.emitJobEvent('start', job, job.type);
    if( fn.length === 2 ) { // user provided a two argument function, doesn't need workerCtx
      fn(job, doneCallback);
    } else { // user wants workerCtx parameter, make done callback the last
      fn(job, workerCtx, doneCallback);
    }
  }.bind(this));

  return this;
};

/**
 * Atomic ZPOP implementation.
 *
 * @param {String} key
 * @param {Function} fn
 * @api private
 */

Worker.prototype.zpop = function( key, fn ) {
  this.client
    .multi()
    .zrange(key, 0, 0)
    .zremrangebyrank(key, 0, 0)
    .exec(function( err, res ) {
      if( err || !res || !res[ 0 ] || !res[ 0 ].length ) return fn(err);
      var id = res[ 0 ][ 0 ] || res[ 0 ][ 1 ][ 0 ];
      fn(null, this.client.stripFIFO(id));
    }.bind(this));
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
  // BLPOP indicates we have a new inactive job to process
  client.blpop(client.getKey(self.type + ':jobs'), 0, function( err ) {
    if( err || !self.running ) {
      if( self.client && self.client.connected && !self.client.closing ) {
        self.client.lpush(self.client.getKey(self.type + ':jobs'), 1, noop);
      }
      return fn(err);		// SAE: Added to avoid crashing redis on zpop
    }
    // Set job to a temp value so shutdown() knows to wait
    self.job = true;
    self.zpop(self.client.getKey('jobs:' + self.type + ':inactive'), function( err, id ) {
      if( err || !id ) {
        self.idle();
        return fn(err /*|| "No job to pop!"*/);
      }
      Job.get(id, fn);
    });
  });
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

  // Wrap `fn` so we don't pass `job` to it
  var _fn = function( job ) {
    if( job && self.job && job.id != self.job.id ) {
      return; // simply ignore older job events currently being received until the right one comes...
    }
    shutdownTimer && clearTimeout(shutdownTimer);
    self.removeAllListeners();
    self.job        = null;
    //Safeyly kill any blpop's that are waiting.
    (self.type in clients) && clients[ self.type ].quit();
    delete clients[ self.type ];
    self.cleaned_up = true;
    //fix half-blob job fetches if any
    self.client.lpush(self.client.getKey(self.type + ':jobs'), 1, fn || noop);
  };

  if( !this.running ) return _fn();
  this.running = false;

  // As soon as we're free, signal that we're done
  if( !this.job ) {
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
          self.failed(self.job, { error: true, message: 'Shutdown' });
        }
      } else {
        // no job running, just finish immediately
        _fn();
      }
    }.bind(this), timeout);
  }
};

Worker.prototype.emitJobEvent = function( event, job, arg1, arg2 ) {
  if( this.cleaned_up ) return;
  events.emit(job.id, event, arg1, arg2);
  this.emit('job ' + event, job);
};

Worker.prototype.resume = function() {
  if( this.running ) return false;
  this.cleaned_up          = false;
  this.drop_user_callbacks = false;
  this.running             = true;
  return true;
};
