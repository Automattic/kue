var job, kue, queue;

kue = require('../');

queue = kue.createQueue({
  disableSearch: true
});

job = queue.create('test job', {
  num: 1
}).attempts(2).delay(1000 * 10).backoff({
  type: 'exponential'
}).save(function(err) {
  if (err) {
    console.log(err);
  }
  console.log('job added', job.id);
  queue.shutdown(1000, function(err) {
    console.log('queue closed');
  });
});
