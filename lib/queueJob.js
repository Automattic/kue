/*!
 * kue - Job
 * Copyright (c) 2013 Automattic <behradz@gmail.com>
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Job            = require('./job')
  , noop         = function() {};

/**
 * Expose `Job`.
 */

module.exports = function QueueJob(queue){

  var self = this
  var redis = queue.redis
  var events = queue.events

  self.disableSearch = queue._options.disableSearch !== false;


  self.jobEvents = queue._options.jobEvents !== undefined ? queue._options.jobEvents : true;

  /**
   * Search instance.
   */
  var search;
  self.getSearch = function getSearch() {
    if( search ) return search;
    var reds = require('reds');
    reds.createClient = redis.createClient;
    return search = reds.createSearch(redis.client().getKey('search'));
  }

  /**
   * Default job priority map.
   */

  var priorities = self.priorities = {
    low: 10, normal: 0, medium: -5, high: -10, critical: -15
  };

  /**
   * Map `jobs` by the given array of `ids`.
   *
   * @param {Object} jobs
   * @param {Array} ids
   * @return {Array}
   * @api private
   */

  function map( jobs, ids ) {
    var ret = [];
    ids.forEach(function( id ) {
      if( jobs[ id ] ) ret.push(jobs[ id ]);
    });
    ret     = ret.sort(function( a, b ) {
      return parseInt(a.id) - parseInt(b.id);
    });
    return ret;
  }

  /**
   * Return a function that handles fetching
   * of jobs by the ids fetched.
   *
   * @param {Function} fn
   * @param {String} order
   * @param {String} jobType
   * @return {Function}
   * @api private
   */

  function get( fn, order, jobType) {
    return function( err, ids ) {
      if( err ) return fn(err);
      var pending = ids.length
        , jobs    = {};
      if( !pending ) return fn(null, ids);
      ids.forEach(function( id ) {
        id = redis.client().stripFIFO(id); // turn zid back to regular job id
        self.get(id, jobType, function( err, job ) {
          if( err ) {
            console.error(err);
          } else {
            jobs[ redis.client().createFIFO(job.id) ] = job;
          }
          --pending || fn(null, 'desc' == order
            ? map(jobs, ids).reverse()
            : map(jobs, ids));

        });
      });
    }
  }

  /**
   * Get with the range `from`..`to`
   * and invoke callback `fn(err, ids)`.
   *
   * @param {Number} from
   * @param {Number} to
   * @param {String} order
   * @param {Function} fn
   * @api public
   */

  self.range = function( from, to, order, fn ) {
    redis.client().zrange(redis.client().getKey('jobs'), from, to, get(fn, order));
  };

  /**
   * Get jobs of `state`, with the range `from`..`to`
   * and invoke callback `fn(err, ids)`.
   *
   * @param {String} state
   * @param {Number} from
   * @param {Number} to
   * @param {String} order
   * @param {Function} fn
   * @api public
   */

  self.rangeByState = function( state, from, to, order, fn ) {
    redis.client().zrange(redis.client().getKey('jobs:' + state), from, to, get(fn, order));
  };

  /**
   * Get jobs of `type` and `state`, with the range `from`..`to`
   * and invoke callback `fn(err, ids)`.
   *
   * @param {String} type
   * @param {String} state
   * @param {Number} from
   * @param {Number} to
   * @param {String} order
   * @param {Function} fn
   * @api public
   */

  self.rangeByType = function( type, state, from, to, order, fn ) {
    redis.client().zrange(redis.client().getKey('jobs:' + type + ':' + state), from, to, get(fn, order, type));
  };

  /**
   * Get job with `id` and callback `fn(err, job)`.
   *
   * @param {Number} id
   * @param {String} jobType is optional
   * @param {Function} fn
   * @api public
   */

  self.get = function( id, jobType, fn ) {
    if (id === null || id === undefined) {
      return fn(new Error('invalid id param'));
    }
    if (typeof jobType === 'function' && !fn) {
      fn = jobType;
      jobType = '';
    }
    var client = redis.client()
      , job    = self.createJob();

    job.id = id;
    job.zid = client.createFIFO(id);
    client.hgetall(client.getKey('job:' + job.id), function( err, hash ) {
      if( err ) return fn(err);
      if( !hash ) {
        self.removeBadJob(job.id, jobType);
        return fn(new Error('job "' + job.id + '" doesnt exist'));
      }
      if( !hash.type ) {
        self.removeBadJob(job.id, jobType);
        return fn(new Error('job "' + job.id + '" is invalid'))
      }
      // TODO: really lame, change some methods so
      // we can just merge these
      job.type              = hash.type;
      job._ttl              = hash.ttl;
      job._delay            = hash.delay;
      job.priority(Number(hash.priority));
      job._progress         = hash.progress;
      job._attempts         = Number(hash.attempts);
      job._max_attempts     = Number(hash.max_attempts);
      job._state            = hash.state;
      job._error            = hash.error;
      job.created_at        = hash.created_at;
      job.promote_at        = hash.promote_at;
      job.updated_at        = hash.updated_at;
      job.failed_at         = hash.failed_at;
      job.started_at        = hash.started_at;
      job.duration          = hash.duration;
      job.workerId          = hash.workerId;
      job._removeOnComplete = hash.removeOnComplete;
      try {
        if( hash.data ) job.data = JSON.parse(hash.data);
        if( hash.result ) job.result = JSON.parse(hash.result);
        if( hash.progress_data ) job.progress_data = JSON.parse(hash.progress_data);
        if( hash.backoff ) {
          var source = 'job._backoff = ' + hash.backoff + ';';
  //                require('vm').runInContext( source );
          eval(source);
        }
      } catch(e) {
        err = e;
      }
      fn(err, job);
    });
  };

  /**
   * Remove all references to an invalid job. Will remove leaky keys in redis keys:TYPE:STATE when
   * self.rangeByType is used.
   *
   * @param {Number} id
   * @param {String} jobType
   */

  self.removeBadJob = function( id, jobType) {
    var client = redis.client();
    var zid = client.createFIFO(id);
    client.multi()
      .del(client.getKey('job:' + id + ':log'))
      .del(client.getKey('job:' + id))
      .zrem(client.getKey('jobs:inactive'), zid)
      .zrem(client.getKey('jobs:active'), zid)
      .zrem(client.getKey('jobs:complete'), zid)
      .zrem(client.getKey('jobs:failed'), zid)
      .zrem(client.getKey('jobs:delayed'), zid)
      .zrem(client.getKey('jobs'), zid)
      .zrem(client.getKey('jobs:' + jobType + ':inactive'), zid)
      .zrem(client.getKey('jobs:' + jobType+ ':active'), zid)
      .zrem(client.getKey('jobs:' + jobType + ':complete'), zid)
      .zrem(client.getKey('jobs:' + jobType + ':failed'), zid)
      .zrem(client.getKey('jobs:' + jobType + ':delayed'), zid)
      .exec();
    if( !self.disableSearch ) {
      self.getSearch().remove(id);
    }
  };

  /**
   * Remove job `id` if it exists and invoke callback `fn(err)`.
   *
   * @param {Number} id
   * @param {Function} fn
   * @api public
   */

  self.remove = function( id, fn ) {
    fn = fn || noop;
    self.get(id, function( err, job ) {
      if( err ) return fn(err);
      if( !job ) return fn(new Error('failed to find job ' + id));
      job.remove(fn);
    });
  };

  /**
   * Get log for job `id` and callback `fn(err, log)`.
   *
   * @param {Number} id
   * @param {Function} fn
   * @return {Type}
   * @api public
   */

  self.log = function( id, fn ) {
    /*redis*/
    queue.client/*()*/.lrange(queue.client.getKey('job:' + id + ':log'), 0, -1, fn);
  };

  self.queue = queue
  self.createJob = function( type, data ) {
    return new Job(type, data, this);
  }

  return self
}
