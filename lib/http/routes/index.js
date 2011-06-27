
/**
 * Module dependencies.
 */

var Queue = require('../../q')
  , Job = require('../../queue/job')
  , queue = new Queue;

/**
 * Serve the index page.
 */

exports.index = function(req, res){
  res.render('index');
};

/**
 * Get statistics including:
 * 
 *   - inactive: array of inactive job ids
 *   - complete: array of complete job ids
 *   - active: array of active job ids
 *   - failures: array of failing job ids
 *
 */

exports.stats = function(req, res){
  get(queue)
    ('inactiveCount')
    ('completeCount')
    ('activeCount')
    ('failuresCount')
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
 * Get jobs by :type, :status, and range :from..:to.
 */

exports.jobs = function(req, res){
  var type = req.params.type
    , status = req.params.status
    , from = parseInt(req.params.from, 10)
    , to = parseInt(req.params.to, 10);

  Job.range(type, status, from, to, function(err, ids){
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