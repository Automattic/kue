
/*!
 * q - http - routes - json
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Queue = require('../../q')
  , Job = require('../../queue/job')
  , queue = new Queue;

/**
 * Get statistics including:
 * 
 *   - inactive: array of inactive job ids
 *   - complete: array of complete job ids
 *   - active: array of active job ids
 *   - failed: array of failing job ids
 *
 */

exports.stats = function(req, res){
  get(queue)
    ('inactiveCount')
    ('completeCount')
    ('activeCount')
    ('failedCount')
    (function(err, obj){
      if (err) return res.send({ error: err.message });
      res.send(obj);
    });
};

/**
 * Get job types.
 */

exports.types = function(req, res){
  queue.types(function(err, types){
    if (err) return res.send({ error: err.message });
    res.send(types);
  });
};

/**
 * Get jobs by :status, and range :from..:to.
 */

exports.jobRange = function(req, res){
  var status = req.params.status
    , from = parseInt(req.params.from, 10)
    , to = parseInt(req.params.to, 10);

  Job.range(status, from, to, function(err, ids){
    if (err) return res.send({ error: err.message });
    res.send(ids);
  });
};

/**
 * Get jobs by :type, :status, and range :from..:to.
 */

exports.jobTypeRange = function(req, res){
  var type = req.params.type
    , status = req.params.status
    , from = parseInt(req.params.from, 10)
    , to = parseInt(req.params.to, 10);

  Job.rangeByType(type, status, from, to, function(err, ids){
    if (err) return res.send({ error: err.message });
    res.send(ids);
  });
};

/**
 * Get job by :id.
 */

exports.job = function(req, res){
  var id = req.params.id;
  Job.get(id, function(err, job){
    if (err) return res.send({ error: err.message });
    res.send(job);
  });
};

/**
 * Remove job :id.
 */

exports.remove = function(req, res){
  var id = req.params.id;
  Job.remove(id, function(err){
    if (err) return res.send({ error: err.message });
    res.send({ message: 'job ' + id + ' removed' });
  });
};

/**
 * Update job :id :priority.
 */

exports.updatePriority = function(req, res){
  var id = req.params.id
    , priority = parseInt(req.params.priority, 10);

  if (isNaN(priority)) return res.send({ error: 'invalid priority' });
  Job.get(id, function(err, job){
    if (err) return res.send({ error: err.message });
    job.priority(priority);
    job.save(function(err){
      if (err) return res.send({ error: err.message });
      res.send({ message: 'updated priority' });
    });
  });
};

/**
 * Get log for job :id.
 */

exports.log = function(req, res){
  var id = req.params.id;
  Job.log(id, function(err, log){
    if (err) return res.send({ error: err.message });
    res.send(log);
  });
};

/**
 * Data fetching helper.
 */

function get(obj) {
  var pending = 0
    , res = {}
    , callback
    , done;

  return function _(arg){
    switch (typeof arg) {
      case 'function':
        callback = arg;
        break;
      case 'string':
        ++pending;
        obj[arg](function(err, val){
          if (done) return;
          if (err) return done = true, callback(err);
          res[arg] = val;
          --pending || callback(null, res);
        });
        break;
    }
    return _;
  };
}