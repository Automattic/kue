
var path = require('path')
  , redis = require('redis')
  , kue = require('../index.js');

  var redisConfig = {
    port   :6379,
    host   :'127.0.0.1',
    options:{
      return_buffer:false,
      retry_backoff:1
    }
  };

  //create the queue to process jobs
  //
  kue.redis.createClient = function() {
    var rc;
    // Redis configuration settings
    rc = redis.createClient(redisConfig.port, redisConfig.host, redisConfig.options);

    return rc;
  };

  var jobs = kue.createQueue();


  function jobCallback(job, jobCB) {

    console.log('new job', job);

    //register to be notified if the job is removed
    job.on('removed', function(err,data){
      console.log('jobremoved');
      jobCB();
    });
  }

  jobs.process('newJob', jobCallback);