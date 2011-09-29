
/*!
 * kue - events
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var redis = require('../redis');

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
  if (!exports.subscribed) exports.subscribe();
};

/**
 * Subscribe to "q:events".
 *
 * @api private
 */

exports.subscribe = function(){
  if (exports.subscribed) return;
  var client = redis.pubsubClient();
  client.subscribe(exports.key);
  client.on('message', exports.onMessage);
  exports.queue = require('../kue').singleton;
  exports.subscribed = true;
};

/**
 * Message handler.
 *
 * @api private
 */

exports.onMessage = function(channel, msg){
  // TODO: only subscribe on {Queue,Job}#on()
  var msg = JSON.parse(msg);

  // map to Job when in-process
  var job = exports.jobs[msg.id];
  if (job) {
    job.emit.apply(job, msg.args);
    // TODO: abstract this out
    if ('progress' != msg.event) delete exports.jobs[job.id];
  }

  // emit args on Queues
  msg.args[0] = 'job ' + msg.args[0];
  msg.args.push(msg.id);
  exports.queue.emit.apply(exports.queue, msg.args);
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
  var client = redis.client()
    , msg = JSON.stringify({
      id: id
    , event: event
    , args: [].slice.call(arguments, 1)
  });
  client.publish(exports.key, msg);
};
