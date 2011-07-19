
/*!
 * kue - events
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var pool = require('./pool');

/**
 * Job map.
 */

exports.jobs = {};

/**
 * Pub/sub key.
 */

exports.key = 'q:events';

/**
 * Add `job` to the jobs map, used
 * to grab the in-process object
 * so we can emit relative events.
 *
 * @param {Job} job
 * @api private
 */

exports.add = function(job){
  if (job.id) exports.jobs[job.id] = job;
  if (!exports.subscribed) {
    exports.subscribe();
    exports.subscribed = true;
  }
};

/**
 * Subscribe to "q:events".
 *
 * @api private
 */

exports.subscribe = function(){
  var client = pool.pubSubClient();
  client.subscribe(exports.key);
  client.on('message', this.onMessage);
};

/**
 * Message handler.
 *
 * @api private
 */

exports.onMessage = function(channel, msg){
  var msg = JSON.parse(msg)
    , job = exports.jobs[msg.id];
  if (!job) return;
  job.emit.apply(job, msg.args);
  // TODO: abstract this out
  if ('progress' != msg.event) delete exports.jobs[job.id];
};

/**
 * Emit `event` for for job `id` with variable args.
 *
 * @param {Number} id
 * @param {String} event
 * @param {Mixed} ...
 * @api private
 */

exports.emit = function(id, event) {
  var client = pool.alloc()
    , msg = JSON.stringify({
      id: id
    , event: event
    , args: [].slice.call(arguments, 1)
  });
  client.publish(exports.key, msg);
};
