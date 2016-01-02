var get = require('../helpers/get');
var provides = require('../middleware/provides');
var queue = require('./json').queue;

module.exports.autoroute = {
    get: {
        '/stats': [provides('json'), stats],
        '/stats/:since': [provides('json'), statsSince]
    }
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
function stats( req, res ) {
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
}

/**
 * Get time series statistics since the provided timestamp including:
 *
 *     - completed counts
 *     - failed counts
 */
function statsSince(req, res) {
  queue.completeSince(parseInt(req.params.since), function(err, completeResult){
    if(err){
      return res.status(500).send(err.message);
    }

    queue.failedSince(parseInt(req.params.since), function(err, failedResult) {
      if(err){
        return res.status(500).send(err.message);
      }

      res.json({
        complete: completeResult,
        failed: failedResult
      });
    });
  });
}
