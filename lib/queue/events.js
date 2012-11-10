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

// pub client 
var pubClient;

/**
 * Add `job` to the jobs map, used
 * to grab the in-process object
 * so we can emit relative events.
 *
 * @param {Job} job
 * @api private
 */

exports.add = function(job, cb){
  if (job.id){
    if (job.id in exports.jobs){

      console.log('already registered');

    }else{
      exports.jobs[job.id] = job;
      exports.subscribe(job.id, cb);
    }
  }
};


var getNextSubKey = function(id){
  return exports.key + ':' + id + ':newsub';
};

var getSubsKey = function(id){
  return exports.key + ':' + id + ':subs';
};

var getClientSubKey = function(id, idx){

  return exports.key + ':' + id + ':sub:' + idx;
}


/**
 * Subscribe to "q:events".
 *
 * @api private
 */

exports.subscribe = function(queueId, cb){

  cb = cb || function(){};

  var lClient = redis.createClient();
  if (!pubClient){
    pubClient = redis.createClient();
  }

  pubClient.incr(getNextSubKey(queueId), function(err,subval){

    // get the number of subs for this key
    var clientId = getClientSubKey(queueId,subval);

    pubClient.sadd([getSubsKey(queueId),subval], function(){});

    var handleMessage = function(channel, data){
      try{
        exports.onMessage(channel,data);
      }catch(err){
        // just continue
      }

      // some attempt to free up this connection, not great practice
      // but blpop is blocking.
      var queueNext = true;
      if (data){
        if (data[1]){
          queueNext = ((JSON.parse(data[1]).event !== 'removed') &&
            (JSON.parse(data[1]).event !== 'complete'));
        }
      }

      if (queueNext){
        lClient.blpop([clientId,0],handleMessage);
      }else{

        // extract my Id and unsubscribe me
        exports.unsubscribe(queueId,subval, function(){});

        lClient.end();
        delete lClient;
      }
    };

  ﻿  lClient.blpop([clientId,0],handleMessage);

    cb(err,subval);
  });
};


exports.unsubscribe = function(queueId, subval, cb){

  if (!pubClient){
    pubClient = redis.createClient();
  }

  pubClient.srem([getSubsKey(queueId),subval], function(err,dontcare){

    // we're removed from the list, clear up our queue
    ﻿// cheap hack - we know we don't reuse queue ID's so allow it to expire
    // after X seconds to catch any lingering events
    pubClient.expire([getClientSubKey(queueId,subval),5], function(err,dontcare){

      // we're all cleaned up, return
      cb(err,subval);

      // custom code for our case - after the last user unsubscribes, get rid
      // of the counter - not really safe, but we shouldn't be in a situation
      // where new users are subscribing when old ones are dropping off.
      pubClient.scard([getSubsKey(queueId)], function(err,size){
        if (size == 0){
          pubClient.del(getNextSubKey(queueId));
        }
      });
    });
  });
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
      if ('removed' === msg.event){
        delete exports.jobs[job.id];
      }
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
  if (!pubClient){
    pubClient = redis.createClient();
  }

  var msg = JSON.stringify({
      id: id
    , event: event
    , args: [].slice.call(arguments, 1)
  });

  // get the registered clients for this event,
  pubClient.smembers([getSubsKey(id)], function(err,members){
    //notify them all
    for (var itr in members){
      pubClient.rpush([getClientSubKey(id,members[itr]), msg]);
    }
  })

};
