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

var client;

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
  if (job.id){
    if (job.id in exports.jobs){

      console.log('already registered');

    }else{
      exports.jobs[job.id] = job;
      exports.subscribe(job.id);
    }
  }
};

/**
 * Subscribe to "q:events".
 *
 * @api private
 */

exports.subscribe = function(queueId){

  if (!client){
    client = redis.createClient()
  }

  var handleMessage = function(channel, data){
    try{
      exports.onMessage(channel,data);
    }catch(err){
      // just continue
    }
﻿    process.nextTick(function(){ client.blpop(exports.key + ':' + queueId,0,handleMessage); });

  };

﻿  process.nextTick(function(){ client.blpop(exports.key + ':' + queueId,0,handleMessage); });

};

/**
 * Message handler.
 *
 * @api private
 */

exports.onMessage = function(channel, msg){
  // TODO: only subscribe on {Queue,Job}#on()
  if ((msg) && (msg.length >1))
  {
    var msg = JSON.parse(msg[1]);

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

exports.emit = function(id, event) {
  var  lclient = redis.client();

  var msg = JSON.stringify({
      id: id
    , event: event
    , args: [].slice.call(arguments, 1)
  });
  lclient.rpush(exports.key + ':' + id, msg);
};
