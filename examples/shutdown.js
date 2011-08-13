
var kue = require('../');

// create our job queue

var jobs = kue.createQueue();

// start redis with $ redis-server

// sending jobs with type 'job1'
var i = 0;
setInterval(function(){
    -function(i) {
        jobs.create('job1', {
            title : 'Job #' + i
        }).save();
    }(i++)
}, 500)

// register job1 processor
jobs.process('job1', 10, function(job, done) {
    console.log('got job: %s', job.data.title);
    // process after 1sec
    setTimeout(function() {
        console.log('job "%s" done', job.data.title)
        done();
    }, 1000);
});

// after 2 sec, shutdown Kue
setTimeout(function() {
  console.log('shutting down', arguments);
  jobs.shutdown(function(){
    // 'shutted down' will be called after all workers will done their current jobs
    console.log('shutted down', arguments);
  })
}, 2000)