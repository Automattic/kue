
var kue = require('../')
  , express = require('express');

// create our job queue

var jobs = kue.createQueue();
jobs.clearResources(["test:a"], function(err, bla) { console.log(err, bla)});

function create() {
  var name = ['tobi', 'loki', 'jane', 'manny'][Math.random() * 4 | 0];
  jobs.create('test', {
      title: 'converting ' + name + '\'s to avi'
    , user: 1
    , frames: 200
  }).save();
  setTimeout(create, Math.random() * 3000 | 0);
}

jobs.setLimits(
        {"test:a" : 20}, 
        function(err, res) {
            console.log("limits", err, res)
            create();
        });

// process video conversion jobs, 3 at a time.

jobs.process('test', 2, function(job, done){
  process.stdout.write(".");
  job.useResources(
    {"test:a":20, 
     "test:x:le":1},
    30000,
    function() {
      console.log('DO WORK');
      setTimeout(done, Math.random() * 5000);
    }
  );
});

// process 10 emails at a time

// start the UI
kue.app.listen(3000);
console.log('UI started on port 3000');

jobs.promote(1000);
