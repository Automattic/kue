
/**
 * Default job priority map.
 */

var priorities = {
    '10': 'low'
  , '0': 'normal'
  , '-5': 'medium'
  , '-10': 'high'
  , '-15': 'critical'
};

/**
 * Expose priorities.
 */

exports.priorities = priorities;

/**
 * Return priority string for `job`.
 *
 * @param {Job} job
 * @return {String}
 * @api public
 */

exports.priority = function(job){
  return priorities[job.priority()] || job.priority();
};
