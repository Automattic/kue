
var kue = require('./')
  , Job = kue.Job;

// create our job queue

var jobs = kue.createQueue();

jobs.on('job complete', function(id){
  console.log('got %d', id);
  Job.get(id, function(err, job){
    if (err) return;
    console.log(job.data);
  });
});