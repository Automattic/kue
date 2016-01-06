var _ = require('lodash');

var Job = require('../../../queue/job');
var provides = require('../../middleware/provides');

module.exports.autoroute = {
  get: {
    '/jobs/:id': [provides(['application/vnd.api+json', 'json']), getJob],
  }
};

function getJob(req, res) {
  Job.get(req.params.id, function(err, job) {
    if (err) {
      return res.json({
        error: err.message
      });
    }

    res.json({
      data: {
        type:'job',
        id: job.id,
        attributes: _.chain(job).pick('type', 'priority', 'progress', 'state', 'duration', 'workerId', 'attempts').assign({
          'job-data': job.data,
          priority: job.priority(),
          progress: job.progress(),
          state: job.state(),
          'created-at': job.created_at,
          'promote-at': job.promote_at,
          'updated-at': job.updated_at,
          'started-at': job.started_at,
          attempts: {
            made: job._attempts,
            max: job._max_attempts,
            remaining: Math.max(parseInt(job._max_attempts)  - parseInt(job._attempts), 0),
          }
        }).value()
      }
    });
  });
}
