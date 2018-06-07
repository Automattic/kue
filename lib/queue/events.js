/*!
 * kue - events
 * Copyright (c) 2013 Automattic <behradz@gmail.com>
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

exports.key = 'events';

/**
 * Add `job` to the jobs map, used
 * to grab the in-process object
 * so we can emit relative events.
 *
 * @param {Job} job
 * @api private
 */
exports.callbackQueue = [];

exports.add = function( job, callback ) {
  if( job.id ) {
    if(!exports.jobs[ job.id ])
      exports.jobs[ job.id ] = [];

    exports.jobs[ job.id ].push(job);
  }
//  if (!exports.subscribed) exports.subscribe();
  if( !exports.subscribeStarted ) exports.subscribe();
  if( !exports.subscribed ) {
    exports.callbackQueue.push(callback);
  } else {
    callback();
  }
};

/**
 * Remove `job` from the jobs map.
 *
 * @param {Job} job
 * @api private
 */

exports.remove = function( job ) {
  delete exports.jobs[ job.id ];
};

/**
 * Subscribe to "q:events".
 *
 * @api private
 */

exports.subscribe = function() {
//  if (exports.subscribed) return;
  if( exports.subscribeStarted ) return;
  var client    = redis.pubsubClient();
  client.on('message', exports.onMessage);
  client.subscribe(client.getKey(exports.key),  function() {
    exports.subscribed = true;
    while( exports.callbackQueue.length ) {
      process.nextTick(exports.callbackQueue.shift());
    }
  });
  exports.queue = require('../kue').singleton;
//  exports.subscribed = true;
  exports.subscribeStarted = true;
};

exports.unsubscribe = function() {
  var client               = redis.pubsubClient();
  client.unsubscribe();
  client.removeAllListeners();
  exports.subscribeStarted = false;
};

/**
 * Message handler.
 *
 * @api private
 */

exports.onMessage = function( channel, msg ) {
  // TODO: only subscribe on {Queue,Job}#on()
  msg = JSON.parse(msg);

  // map to Job when in-process
  var jobs = exports.jobs[ msg.id ];
  if( jobs && jobs.length > 0 ) {
    for (var i = 0; i < jobs.length; i++) {
      var job = jobs[i];
      job.emit.apply(job, msg.args);
      if( [ 'complete', 'failed' ].indexOf(msg.event) !== -1 ) exports.remove(job);
    }
  }
  // emit args on Queues
  msg.args[ 0 ] = 'job ' + msg.args[ 0 ];
  msg.args.splice(1, 0, msg.id);
  if( exports.queue ) {
    exports.queue.emit.apply(exports.queue, msg.args);
  }
};

/**
 * Emit `event` for for job `id` with variable args.
 *
 * @param {Number} id
 * @param {String} event
 * @param {Mixed} ...
 * @api private
 */

exports.emit = function( id, event ) {
  var client = redis.client()
    , msg    = JSON.stringify({
        id: id, event: event, args: [].slice.call(arguments, 1)
      });
  client.publish(client.getKey(exports.key), msg, function () {});
};
