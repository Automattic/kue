
/**
 * Module dependencies.
 */

var Queue = require('../../q')
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
    ('inactive')
    ('complete')
    ('active')
    ('failures')
    (function(err, obj){
      return res.send({ error: 'failed to fetch stats' });
      if (err) return res.send({ error: 'failed to fetch stats' });
      res.send(obj);
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