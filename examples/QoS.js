
var kue = require('../')
  , express = require('express');

// create our job queue

var jobs = kue.createQueue();
jobs.watchdog();

// start redis with $ redis-server

// create some jobs at random,
// usually you would create these
// in your http processes upon
// user input etc.

var count = 1000;

function create() {
  if(count-- <= 0 ) return;
  
  var name = ['tobi', 'loki', 'jane', 'manny'][Math.random() * 4 | 0];
  console.log('- creating job for %s', name);

  var stage1 = null, stage2 = null;
  
  stage1 = jobs.create('video conversion', {
      title: 'converting ' + name + '\'s to avi'
    , user: 1
    , frames: 200
  }).heartbeat(10000).save(function(err){
	  stage2 = jobs.create('video conversion', {
	      title: 'converting ' + name + '\'s to mpeg'
	    , user: 1
	    , frames: 200
	  }).heartbeat(10000).save(function(err){
		  jobs.create('video analysis', {
		      title: 'analyzing ' + name + '\'s avi'
		    , user: 1
		    , frames: 200
		  }).heartbeat(10000).after(stage2).serialize('analysis').save();
		  
		  jobs.create('video analysis', {
		      title: 'analyzing ' + name + '\'s avi and mpeg'
		    , user: 1
		    , frames: 200
		  }).heartbeat(10000).after(stage1).after(stage2).serialize('analysis').save();
	  });	  
  });

  setTimeout(create, Math.random() * 3000 | 0);
}

if(process.argv.length > 2) {
	count = Number(process.argv[2]);
	create();
}
else
	console.log('usage: node QoS.js [<number-of-jobs>]');

// process video analysis jobs, 6 at a time.

jobs.process('video analysis', 6, function(job, done){
  var frames = job.data.frames;
  console.log("job process %d", job.id);
  function next(i) {
    // pretend we are doing some work
    convertFrame(i, function(err){
      if (err) return done(err);
      // report progress, i/frames complete
      job.progress(i, frames);
      if (i == frames) done();
      else next(i + 1);
    });
  }
  next(0);
});

//process video conversion jobs, 4 at a time.

jobs.process('video conversion', 4, function(job, done){
  var frames = job.data.frames;
  console.log("job process %d", job.id);
  function next(i) {
    // pretend we are doing some work
    convertFrame(i, function(err){
      if (err) return done(err);
      // report progress, i/frames complete
      job.progress(i, frames);
      if (i == frames) done();
      else next(i + 1);
    });
  }
  next(0);
});

function convertFrame(i, fn) {
  setTimeout(fn, Math.random() * 100);
}

// start the UI
var app = express.createServer();
app.use(express.basicAuth('foo', 'bar'));
app.use(kue.app);
app.listen(3000);
console.log('UI started on port 3000');