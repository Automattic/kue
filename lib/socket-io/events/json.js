/*!
 * kue - http - routes - json
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Queue  = require('../../kue')
  , Job    = require('../../queue/job')
  , reds   = require('reds')
  , lodash = require('lodash')
  , queue  = Queue.createQueue();

/**
 * Search instance.
 */

var search;
function getSearch() {
  if( search ) return search;
  reds.createClient = require('../../redis').createClient;
  return search = reds.createSearch(queue.client.getKey('search'));
};

/**
 * Get statistics including:
 *
 *   - inactive count
 *   - active count
 *   - complete count
 *   - failed count
 *   - delayed count
 *
 */

exports.stats = function( send ) {
  get(queue)
  ('inactiveCount')
  ('completeCount')
  ('activeCount')
  ('failedCount')
  ('delayedCount')
  ('workTime')
  (function( err, obj ) {
    if( err ) return send({ error: err.message });
    send(obj);
  });
};

/**
 * Get job types.
 */

exports.types = function( send ) {
  if(typeof send === 'undefined') return;

  queue.types(function( err, types ) {
    if( err ) return send({ error: err.message });
    send(types);
  });
};

/**
 * Get jobs by range :from..:to.
 */

exports.jobRange = function( body , send) {
  if(typeof send === 'undefined') return;

  var from  = parseInt(body.from, 10)
    , to    = parseInt(body.to, 10)
    , order = body.order;

  Job.range(from, to, order, function( err, jobs ) {
    if( err ) return send({ error: err.message });
    send(jobs);
  });
};

/**
 * Get jobs by :state, and range :from..:to.
 */

exports.jobStateRange = function( body , send ) {
  if(typeof send === 'undefined') return;

  var state = body.state
    , from  = parseInt(body.from, 10)
    , to    = parseInt(body.to, 10)
    , order = body.order;

  Job.rangeByState(state, from, to, order, function( err, jobs ) {
    if( err ) return send({ error: err.message });
    send(jobs);
  });
};

/**
 * Get jobs by :type, :state, and range :from..:to.
 */

exports.jobTypeRange = function( body , send ) {
  if(typeof send === 'undefined') return;

  var type  = body.type
    , state = body.state
    , from  = parseInt(body.from, 10)
    , to    = parseInt(body.to, 10)
    , order = body.order;

  Job.rangeByType(type, state, from, to, order, function( err, jobs ) {
    if( err ) return send({ error: err.message });
    send(jobs);
  });
};

/**
 * Get jobs stats by :type and :state
 */

exports.jobTypeStateStats = function( body, send ) {
  if(typeof send === 'undefined') return;

  var type  = body.type
    , state = body.state;

  queue.cardByType(type, state, function( err, count ) {
    if( err ) return send({ error: err.message });
    send({ count: count });
  });
};

/**
 * Get job by :id.
 */

exports.job = function( body, send ) {
  if(typeof send === 'undefined') return;

  var id = body.id;
  Job.get(id, function( err, job ) {
    if( err ) return send({ error: err.message });
    send(job);
  });
};

/**
 * Restart job by :id.
 */

exports.inactive = function( body, send ) {
  if(typeof send === 'undefined') return;

  var id = body.id;
  Job.get(id, function( err, job ) {
    if( err ) return send({ error: err.message });
    job.inactive();
    send({ message: 'job ' + id + ' inactive' });
  });
};

/**
 * Create a job.
 */

exports.createJob = function( body, send ) {
  if(typeof send === 'undefined') return;

  function _create( args, next ) {
    if( !args.type ) return next({ error: 'Must provide job type' }, null, 400);

    var job     = new Job(args.type, args.data || {});
    var options = args.options || {};
    if( options.attempts ) job.attempts(parseInt(options.attempts));
    if( options.priority ) job.priority(options.priority);
    if( options.delay ) job.delay(options.delay);
    if( options.searchKeys ) job.searchKeys(options.searchKeys);
    if( options.backoff ) job.backoff(options.backoff);
    if( options.removeOnComplete ) job.removeOnComplete(options.removeOnComplete);
    if( options.ttl ) job.ttl(options.ttl);
    
    job.save(function( err ) {
      if( err ) {
        return next({ error: err.message }, null, 500);
      }
      else {
        return next(null, {
          id:job.id
        });
      }
    });
  }

  if( !lodash.isEmpty(body) ) {
    if( lodash.isArray(body) ) {
      var returnErrorCode = 0; // Default: we don't have any error
      var i      = 0, len = body.length;
      var result = [];
      -function _iterate() {
        _create(body[ i ], function( err, status, errCode ) {
          result.push(err || status);
          if( err ) {
            // Set an error code for the response
            if( !returnErrorCode ) {
              returnErrorCode = errCode || 500;
            }
          }

          // Keep processing even after an error
          i++;
          if( i < len ) {
            _iterate();
          }
          else {
            // If we had an error code, return it
            if( returnErrorCode ) {
              //res.status(returnErrorCode);
            }

            send(result);
          }
        })
      }()
    }
    else {
      _create(body, function( err, status, errCode ) {
        if( err ) {
          //res.status(errCode || 500).json(err);
          send(err);
        }
        else {
          send(status);
        }
      })
    }
  }
  else {
    //res.status(204); // "No content" status code
  }
};

/**
 * Remove job :id.
 */

exports.remove = function( body, send ) {
  if(typeof send === 'undefined') return;

  var id = body.id;
  Job.remove(id, function( err ) {
    if( err ) return send({ error: err.message });
    send({ message: 'job ' + id + ' removed' });
  });
};

/**
 * Update job :id :priority.
 */

exports.updatePriority = function( body, send ) {
  if(typeof send === 'undefined') return;

  var id       = body.id
    , priority = parseInt(body.priority, 10);

  if( isNaN(priority) ) return send({ error: 'invalid priority' });
  Job.get(id, function( err, job ) {
    if( err ) return send({ error: err.message });
    job.priority(priority);
    job.save(function( err ) {
      if( err ) return send({ error: err.message });
      send({ message: 'updated priority' });
    });
  });
};

/**
 * Update job :id :state.
 */

exports.updateState = function( body, send ) {
  if(typeof send === 'undefined') return;

  var id    = body.id
    , state = body.state;

  Job.get(id, function( err, job ) {
    if( err ) return send({ error: err.message });
    job.state(state);
    job.save(function( err ) {
      if( err ) return send({ error: err.message });
      send({ message: 'updated state' });
    });
  });
};

/**
 * Search and respond with ids.
 */

exports.search = function( body, send ) {
  if(typeof send === 'undefined') return;

  getSearch().query(body.q).end(function( err, ids ) {
    if( err ) return send({ error: err.message });
    send(ids);
  });
};

/**
 * Get log for job :id.
 */

exports.log = function( body, send ) {
  if(typeof send === 'undefined') return;

  var id = body.id;
  Job.log(id, function( err, log ) {
    if( err ) return send({ error: err.message });
    send(log);
  });
};

/**
 * Data fetching helper.
 */

function get( obj ) {
  var pending = 0
    , res     = {}
    , callback
    , done;

  return function _( arg ) {
    switch(typeof arg) {
      case 'function':
        callback = arg;
        break;
      case 'string':
        ++pending;
        obj[ arg ](function( err, val ) {
          if( done ) return;
          if( err ) return done = true, callback(err);
          res[ arg ] = val;
          --pending || callback(null, res);
        });
        break;
    }
    return _;
  };
}
