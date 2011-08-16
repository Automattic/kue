
var kue = require('./');

 var jobs = kue.createQueue();

  jobs.process('ping', 100, function(job, done){
    done();
  })

  // create packet
  var length = 64;
  var packet = '', n = 0;
  for (var i = 0; i < length; i++) packet += 'a';

  // start ping
  setInterval(function(){

      // closure on 'n'
      -function(n) {

          var start = new Date;
          var job = jobs.create('ping', packet).save();

          job.on('complete', function(){
              var ms = new Date - start;
              console.log('%d bytes from kue: icmp_seq=%d time=%d ms', packet.length, n, ms);
          });

      }(n++)


  }, 100)

// cluster = cluster()
//   .use(cluster.debug())
//   .set('workers', 2)
//   .start();
// 
// if (cluster.isMaster) {
//   // start the UI
//   kue.app.listen(3000);
//   console.log('UI started on port 3000');
// } else {
//   
//   // create our job queue
// 
//   var jobs = kue.createQueue();
// 
//   // start redis with $ redis-server
// 
//   // create some jobs at random,
//   // usually you would create these
//   // in your http processes upon
//   // user input etc.
// 
//   function create() {
//     var name = ['tobi', 'loki', 'jane', 'manny'][Math.random() * 4 | 0];
//     var job = jobs.create('video conversion', {
//         title: 'converting ' + name + '\'s to avi'
//       , user: 1
//       , frames: 200
//     });
// 
//     job.on('complete', function(){
//         console.log(" Job complete");
//     }).on('failed', function(){
//         console.log(" Job failed");
//     }).on('progress', function(progress){
//       process.stdout.write('\r  job #' + job.id + ' ' + progress + '% complete');
//     });
// 
//     job.save();
// 
//     setTimeout(create, Math.random() * 200 | 0);
//   }
// 
//   create();
// 
//   // process video conversion jobs, 1 at a time.
// 
//   jobs.process('video conversion', 1, function(job, done){
//     var frames = job.data.frames;
// 
//     function next(i) {
//       // pretend we are doing some work
//       convertFrame(i, function(err){
//         if (err) return done(err);
//         // report progress, i/frames complete
//         job.progress(i, frames);
//         if (i >= frames) done()
//         else next(i + Math.random() * 10);
//       });
//     }
// 
//     next(0);
//   });
// 
//   function convertFrame(i, fn) {
//     if (Math.random() > .99) {
//       fn(new Error('fail'));
//       fn();
//     } else {
//       setTimeout(fn, Math.random() * 50);
//     }
//   }
// }


