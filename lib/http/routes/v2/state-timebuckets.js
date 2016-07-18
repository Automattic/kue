var get = require('../../helpers/get');
var provides = require('../../middleware/provides');
var queue = require('../json').queue;

module.exports.autoroute = {
    get: {
        '/state-timebuckets': [provides(['application/vnd.api+json']), getAll],
        '/state-timebuckets/:timestamp': [provides(['application/vnd.api+json']), getOne]
    }
};


/**
 * Get time series statistics since the provided timestamp including:
 *
 *     - completed jobs
 *     - failed jobs
 */
function getAll( req, res ) {
  queue.completeSince(parseInt(req.query.since), function(err, completeResult){
    if(err){
      return res.status(500).send(err.message);
    }

    queue.failedSince(parseInt(req.query.since), function(err, failedResult) {
      if(err){
        return res.status(500).send(err.message);
      }

      res.json(convertToJSONAPI({
        complete: completeResult,
        failed: failedResult
      }));
    });
  });
}

/**
 * Get a single time series "bucket" including:
 *
 *     - completed counts
 *     - failed counts
 */
function getOne(req, res) {
  queue.completeAt(parseInt(req.params.timestamp), function(err, completeResult){
    if(err){
      return res.status(500).send(err.message);
    }

    queue.failedAt(parseInt(req.params.timestamp), function(err, failedResult) {
      if(err){
        return res.status(500).send(err.message);
      }

      res.json(convertToJSONAPI({
        complete: completeResult,
        failed: failedResult
      }));
    });
  });
}

/**
 * Convert object to JSON:API
 */
function convertToJSONAPI(payload) {
  function jobIdToJob(jobId){
    return {
      type: "job",
      id: jobId
    };
  }

  var timestamps = Object.keys(payload.complete);

  //don't know if you need this
  if(!timestamps.length) {
    return {
      data: null
    };
  }

  if(timestamps.length === 1) {
    return {
      data: {
          type: "state-timebucket",
          id: timestamps[0],
          attributes: {
            complete: payload.complete[timestamps[0]].length,
            failed: payload.failed[timestamps[0]].length
          },
          relationships: {
            'complete-jobs': {
              data: payload.complete[timestamps[0]].map(jobIdToJob)
            },
            'failed-jobs': {
              data: payload.failed[timestamps[0]].map(jobIdToJob)
            }
          }
      }
    };
  }

  return {
    data: Object.keys(payload.complete).map(function(timeId){
      return {
        type: "state-timebucket",
        id: timeId,
        attributes: {
          complete: payload.complete[timeId].length,
          failed: payload.failed[timeId].length
        },
        relationships: {
          completeJobs: {
            data: payload.complete[timeId].map(jobIdToJob)
          },
          failedJobs: {
            data: payload.failed[timeId].map(jobIdToJob)
          }
        }
      };
    })
  };
}
