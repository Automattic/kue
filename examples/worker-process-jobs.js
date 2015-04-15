var close, closeIfCan, kue, queue;

kue = require('../');

queue = kue.createQueue({
  disableSearch: true
});

close = function() {
   queue.shutdown(1000, function(err) {
    if (err) {
      console.log(err);
    }
    console.log('queue closed');
  });
};

closeIfCan = function() {
  queue.inactiveCount(function(err, inactive) {
    queue.activeCount(function(err, active) {
      queue.delayedCount(function(err, delayed) {
        console.log('inactive:', inactive);
        console.log('active:', active);
        console.log('delayed:', delayed);
        if (inactive + active === 0) {
          close();
        }
      });
    });
  });
};

queue.on('job complete', function(result) {
  console.log('Job completed with result', result);
  closeIfCan();
}).on('promotion:end', function() {
  console.log('jobs promotion ended');
  queue.inactiveCount(function(err, inactive) {
    queue.activeCount(function(err, active) {
      queue.delayedCount(function(err, delayed) {
        console.log('inactive:', inactive);
        console.log('active:', active);
        console.log('delayed:', delayed);
        if (inactive + active > 0) {
          console.log('processing jobs');
          queue.process('test job', function(job, done) {
            console.log('processing job id', job.id, 'num', job.data.num);
            done();
          });
        } else {
          close();
        }
      });
    });
  });

}).on('promotion:start', function() {
  console.log('jobs promotion started');
});
