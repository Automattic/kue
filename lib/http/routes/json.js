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
  , lodash = require('lodash')
  , queue  = Queue.createQueue();

/**
 * Search instance.
 */

var search;
function getSearch() {
  if( search ) return search;
  var reds = require('reds');
  reds.createClient = require('../../redis').createClient;
  return search = reds.createSearch(queue.client.getKey('search'));
}

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

exports.stats = function( req, res ) {
  get(queue)
  ('inactiveCount')
  ('completeCount')
  ('activeCount')
  ('failedCount')
  ('delayedCount')
  ('workTime')
  (function( err, obj ) {
    if( err ) return res.json({ error: err.message });
    res.json(obj);
  });
};

/**
 * Get job types.
 */

exports.types = function( req, res ) {
  queue.types(function( err, types ) {
    if( err ) return res.json({ error: err.message });
    res.json(types);
  });
};

/**
 * Get jobs by range :from..:to.
 */

exports.jobRange = function( req, res ) {
  var from  = parseInt(req.params.from, 10)
    , to    = parseInt(req.params.to, 10)
    , order = req.params.order;

  Job.range(from, to, order, function( err, jobs ) {
    if( err ) return res.json({ error: err.message });
    res.json(jobs);
  });
};

/**
 * Get jobs by :state, and range :from..:to.
 */

exports.jobStateRange = function( req, res ) {
  var state = req.params.state
    , from  = parseInt(req.params.from, 10)
    , to    = parseInt(req.params.to, 10)
    , order = req.params.order;

  Job.rangeByState(state, from, to, order, function( err, jobs ) {
    if( err ) return res.json({ error: err.message });
    res.json(jobs);
  });
};

/**
 * Get jobs by :type, :state, and range :from..:to.
 */

exports.jobTypeRange = function( req, res ) {
  var type  = req.params.type
    , state = req.params.state
    , from  = parseInt(req.params.from, 10)
    , to    = parseInt(req.params.to, 10)
    , order = req.params.order;

  Job.rangeByType(type, state, from, to, order, function( err, jobs ) {
    if( err ) return res.json({ error: err.message });
    res.json(jobs);
  });
};

/**
 * Get jobs stats by :type and :state
 */

exports.jobTypeStateStats = function( req, res ) {
  var type  = req.params.type
    , state = req.params.state;

  queue.cardByType(type, state, function( err, count ) {
    if( err ) return res.json({ error: err.message });
    res.json({ count: count });
  });
};

/**
 * Get job by :id.
 */

exports.job = function( req, res ) {
  var id = req.params.id;
  Job.get(id, function( err, job ) {
    if( err ) return res.json({ error: err.message });
    res.json(job);
  });
};

/**
 * Restart job by :id.
 */

exports.inactive = function( req, res ) {
  var id = req.params.id;
  Job.get(id, function( err, job ) {
    if( err ) return res.json({ error: err.message });
    job.inactive();
    res.json({ message: 'job ' + id + ' inactive' });
  });
};

/**
 * Create a job.
 */

exports.createJob = function( req, res ) {
  var body = req.body;

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
        return next(null, { message: 'job created', id: job.id });
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
              res.status(returnErrorCode);
            }

            res.json(result);
          }
        })
      }()
    }
    else {
      _create(body, function( err, status, errCode ) {
        if( err ) {
          res.status(errCode || 500).json(err);
        }
        else {
          res.json(status);
        }
      })
    }
  }
  else {
    res.status(204); // "No content" status code
    res.end();
  }
};

/**
 * Remove job :id.
 */

exports.remove = function( req, res ) {
  var id = req.params.id;
  Job.remove(id, function( err ) {
    if( err ) return res.json({ error: err.message });
    res.json({ message: 'job ' + id + ' removed' });
  });
};

/**
 * Update job :id :priority.
 */

exports.updatePriority = function( req, res ) {
  var id       = req.params.id
    , priority = parseInt(req.params.priority, 10);

  if( isNaN(priority) ) return res.json({ error: 'invalid priority' });
  Job.get(id, function( err, job ) {
    if( err ) return res.json({ error: err.message });
    job.priority(priority);
    job.save(function( err ) {
      if( err ) return res.json({ error: err.message });
      res.json({ message: 'updated priority' });
    });
  });
};

/**
 * Update job :id :state.
 */

exports.updateState = function( req, res ) {
  var id    = req.params.id
    , state = req.params.state;

  Job.get(id, function( err, job ) {
    if( err ) return res.json({ error: err.message });
    job.state(state);
    job.save(function( err ) {
      if( err ) return res.json({ error: err.message });
      res.json({ message: 'updated state' });
    });
  });
};

/**
 * Search and respond with ids.
 */

exports.search = function( req, res ) {
  getSearch().query(req.query.q).end(function( err, ids ) {
    if( err ) return res.json({ error: err.message });
    res.json(ids);
  });
};

/**
 * Get log for job :id.
 */

exports.log = function( req, res ) {
  var id = req.params.id;
  Job.log(id, function( err, log ) {
    if( err ) return res.json({ error: err.message });
    res.json(log);
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
