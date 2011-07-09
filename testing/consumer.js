
var kue = require('../')
  , jobs = kue.createQueue();

jobs.process('email', function(job, done){
  var pending = 3
    , total = pending;

  console.log('processing job %d', job.id);
  setTimeout(function(){
    if (Math.random() > .5) {
      console.log('error');
      done(new Error('something broke!'))
    } else {
      setInterval(function(){
        job.log('sending!');
        job.progress(total - pending, total);
        --pending || done();
      }, 3000);
    }
  }, 2000);
});