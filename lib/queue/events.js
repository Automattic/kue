
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

exports.onMessage = function(channel, message){
  var message = JSON.parse(message)
    , job = exports.jobs[message.id];

  if (job) {       
    job.emit(message.status);
    delete exports.jobs[job.id];
  }
};

/**
 * Publish `status` change for job `id`.
 *
 * @param {Number} id
 * @param {String} status
 * @api private
 */

exports.changeStatus = function(id, status) {
  var client = pool.alloc()
    , message = JSON.stringify({
      id: id
    , status: status
  });
  client.publish(exports.key, message);
};
