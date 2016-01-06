var get = require('../helpers/get');
var provides = require('../middleware/provides');
var queue = require('./json').queue;

module.exports.autoroute = {
    get: {
        '/stats': [provides('json'), stats],
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
