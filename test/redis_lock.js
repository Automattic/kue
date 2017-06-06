(function () {
  var kue = require('../'),
      async = require('async'),
      cluster = require('cluster'),
      queue = kue.createQueue(),
      redis = require('redis'),
      client = redis.createClient(),
      clusterSize = process.env.SIZE || 2, // require('os').cpus().length;
      jobType = 'race';

  if (cluster.isMaster) {
    cleanup(function(){
      for (var n = 0; n < 10; n++) {
        queue.create(jobType, {
          n: n
        }).save();
      }

      cluster.on('exit', function (worker) {
        for (var id in cluster.workers) {
          // have to use .process.kill here
          // https://github.com/nodejs/node-v0.x-archive/issues/5832#issuecomment-29224325
          cluster.workers[id].process.kill();
        }

        cleanup(function() {
          process.exit();
        });
      });

      for (var i = 0; i < clusterSize; i++) {
        cluster.fork();
      }
    });

  } else {
    process.once('SIGTERM', function () {
      setTimeout(process.exit, 1000);
    });

    queue.process(jobType, function (job, done) {
      var n = job.data.n;

      console.log('Process ' + process.pid + ' is processing job: ' + n);

      client.get('prev', function (err, prev) {
        if (n && (n - Number(prev) !== 1)) {
          console.error('FAIL');
          done();
          process.exit(1);
        }

        setTimeout(function () {
          client.set('prev', n, done);
          if (n === 9) {
            console.log('Success!');
            process.exit();
          }
        }, 1000);
      });
    });
  }

  function cleanup (cb) {
    kue.Job.range(0, -1, 'asc', function (err, jobs) {
      for (var i = 0; i < jobs.length; i++) {
        if (jobs[i].type === jobType) {
          jobs[i].remove();
        }
      }
      cb();
    });
  }
})();