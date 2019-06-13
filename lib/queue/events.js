/*!
 * kue - events
 * Copyright (c) 2013 Automattic <behradz@gmail.com>
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

module.exports = function QueueEvents(queue){
  var self = this

  var redis = queue.redis
  /**
   * Job map.
   */

  self.jobs = {};

  /**
   * Pub/sub key.
   */

  self.key = 'events';

  /**
   * Add `job` to the jobs map, used
   * to grab the in-process object
   * so we can emit relative events.
   *
   * @param {Job} job
   * @api private
   */
  self.callbackQueue = [];

  self.add = function( job, callback ) {
    if( job.id ) {
      if(!self.jobs[ job.id ])
        self.jobs[ job.id ] = [];

      self.jobs[ job.id ].push(job);
    }
  //  if (!self.subscribed) self.subscribe();
    if( !self.subscribeStarted ) self.subscribe();
    if( !self.subscribed ) {
      self.callbackQueue.push(callback);
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

  self.remove = function( job ) {
    delete self.jobs[ job.id ];
  };

  /**
   * Subscribe to "q:events".
   *
   * @api private
   */

  self.subscribe = function() {
  //  if (self.subscribed) return;
    if( self.subscribeStarted ) return;
    var client    = redis.pubsubClient();
    client.on('message', self.onMessage);
    client.subscribe(client.getKey(self.key),  function() {
      self.subscribed = true;
      while( self.callbackQueue.length ) {
        process.nextTick(self.callbackQueue.shift());
      }
    });
    self.queue = queue;
  //  self.subscribed = true;
    self.subscribeStarted = true;
  };

  self.unsubscribe = function() {
    var client               = redis.pubsubClient();
    client.unsubscribe();
    client.removeAllListeners();
    self.subscribeStarted = false;
  };

  /**
   * Message handler.
   *
   * @api private
   */

  self.onMessage = function( channel, msg ) {
    // TODO: only subscribe on {Queue,Job}#on()
    msg = JSON.parse(msg);

    // map to Job when in-process
    var jobs = self.jobs[ msg.id ];
    if( jobs && jobs.length > 0 ) {
      for (var i = 0; i < jobs.length; i++) {
        var job = jobs[i];
        job.emit.apply(job, msg.args);
        if( [ 'complete', 'failed' ].indexOf(msg.event) !== -1 ) self.remove(job);
      }
    }
    // emit args on Queues
    msg.args[ 0 ] = 'job ' + msg.args[ 0 ];
    msg.args.splice(1, 0, msg.id);
    if( self.queue ) {
      self.queue.emit.apply(self.queue, msg.args);
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

  self.emit = function( id, event ) {
    var client = redis.client()
      , msg    = JSON.stringify({
          id: id, event: event, args: [].slice.call(arguments, 1)
        });
    client.publish(client.getKey(self.key), msg, function () {});
  };

  return self
}
