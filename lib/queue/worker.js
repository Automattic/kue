 
/*!
 * kue - Worker
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , redis = require('../redis')
  , events = require('./events')
  , Job = require('./job');

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

function Worker(queue, type) {
  this.queue = queue;
  this.type = type;
  this.client = Worker.client || (Worker.client = redis.createClient());
  this.interval = 1000;
  this.running = true;
  this.job = null;
}

/**
 * Inherit from `EventEmitter.prototype`.
 */

Worker.prototype.__proto__ = EventEmitter.prototype;

/**
 * Start processing jobs with the given `fn`,
 * checking for jobs every second (by default).
 *
 * @param {Function} fn
 * @return {Worker} for chaining
 * @api private
 */

Worker.prototype.start = function(fn){
  var self = this;
  if (!self.running) return;
  self.getJob(function(err, job){
    if (err) self.error(err, job);
    if (!job || err) return process.nextTick(function(){ self.start(fn); });
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

Worker.prototype.error = function(err, job){
  // TODO: emit non "error"

  console.error(err.stack || err.message || err);
  return this;
};

/**
 * Process a failed `job`. Set's the job's state
 * to "failed" unless more attempts remain, in which
 * case the job is marked as "inactive" and remains
 * in the queue.
 *
 * @param {Function} fn
 * @return {Worker} for chaining
 * @api private
 */

Worker.prototype.failed = function(job, err, fn){
  var self = this;
  self.emit('job failed', job);
  events.emit(job.id, 'failed');
  job.failed().error(err);
  self.error(err, job);
  job.attempt(function(error, remaining, attempts, max){
    if (error) return self.error(error, job);
    remaining
      ? job.inactive()
      : job.failed();
    self.start(fn);
  });
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

Worker.prototype.process = function(job, fn){
  var self = this
    , start = new Date;
  this.job = job;
  job.active();
  /**
   * @author behrad
   * @pause: let the processor to tell work if they want not to continue processing new jobs
   */
  fn(job, function(err, pause){
    if (err) return self.failed(job, err, fn);
    job.complete();
    job.set('duration', job.duration = new Date - start);
    self.emit('job complete', job);
    events.emit(job.id, 'complete');
    if( pause ) {
        self.queue.pause( self.type, function(){} );
    } else {
//        self.start(fn);
    }
    self.job = null;
    self.start(fn);
  },
   /**
    * @author behrad
    * @pause: let the processor to trigger restart for they job processing
    */
   function(){
     if( self.resume() ) {
       self.start( fn );
     }
  });
  return this;
};

/**
 * Atomic ZPOP implementation.
 *
 * @param {String} key
 * @param {Function} fn
 * @api private
 */

Worker.prototype.zpop = function(key, fn){

    /*var store = this.client;
    store.watch(key);
    store.zrange(key, 0, 0, function (err, results) {
       var multi = store.multi();
       multi.zremrangebyrank(key, 0, 0);
       multi.exec(function(err, res){
           if (err) return fn(err);
           if( res && res[0] == 1 ){
                var id = results[0];
                fn(null, id);
           } else {
               fn( "rollback" );
           }
       });
    });*/
    this.client
    .multi()
    .zrange(key, 0, 0)
    .zremrangebyrank(key, 0, 0)
    .exec(function(err, res){
      if (err) return fn(err);
      var id = res[0][0];
      fn(null, id);
    });
};

/**
 * Attempt to fetch the next job. 
 *
 * @param {Function} fn
 * @api private
 */

Worker.prototype.getJob = function(fn){
  var self = this;

  // alloc a client for this job type
  var client = clients[self.type]
    || (clients[self.type] = redis.createClient());

    if( !self.running ) {
        fn( "shutdown" );
    }
  // BLPOP indicates we have a new inactive job to process
  client.blpop('q:' + self.type + ':jobs', 0, function(err) {
    if (err) return fn(err);		// SAE: Added to avoid crashing redis on zpop
      if( !self.running ) {
          return client.lpush('q:' + self.type + ':jobs', 1, function(){fn(err||"shutdown pushback");});
      }
    // Set job to a temp value so shutdown() knows to wait
    self.job = true;
    self.zpop('q:jobs:' + self.type + ':inactive', function(err, id){
      if (err || !id ) {
          self.job = false;
          return fn(err||"No job to pop!");
      }
      Job.get(id, fn);
    });
  });
};

/**
 * Gracefully shut down the worker
 *
 * @param {Function} fn
 * @api private
 */

Worker.prototype.shutdown = function(fn, timeout) {
  var self = this;

  // Wrap `fn` so we don't pass `job` to it
  var _fn = function(job) {
      //fix half-blob job fetches if any...
      setTimeout( function(){ self.client.lpush('q:' + self.type + ':jobs', 1, function(){}); }, 2000 );
      //Safeyly kill any blpop's that are waiting.
      (this.type in clients) && clients[this.type].end();
      delete clients[this.type];
      fn();
  };
  if (!this.running) return _fn();
  this.running = false;

  // As soon as we're free, signal that we're done
  if (!this.job) {
      return _fn();
  }

  this.once('job complete', _fn);
  this.once('job failed', _fn);

  if (timeout) {
    setTimeout(function() {
      self.job.failed && self.job.error({ error: true, message: "Shutdown" }).failed();
      self.job = null;
      _fn();
    }, timeout);
  }
};

Worker.prototype.resume = function() {
    if( this.running ) return false; // was already runnung, not resumed!!!
    this.running = true;
    return true;
};

