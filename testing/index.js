
var kue = require('../')
  , cluster = require('cluster')
  , jobs = kue.createQueue();

cluster = cluster()
  .set('workers', 1)
  .use(cluster.debug())
  .start();

if (cluster.isMaster) {
  kue.app.listen(3000);
} else {
  // jobs.process('email', function(job, done){
  //   var pending = 3
  //     , total = pending;
  // 
  //   setTimeout(function(){
  //     if (Math.random() > .5) {
  //       console.log('error');
  //       done(new Error('something broke!'))
  //     } else {
  //       setInterval(function(){
  //         job.log('sending!');
  //         job.progress(total - pending, total);
  //         --pending || done();
  //       }, 1000);
  //     }
  //   }, 2000);
  // });
}