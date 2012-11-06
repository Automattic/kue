var kue     = require('../index.js')
  , redis   = require('redis')
  , guid    = require('node-guid');

////////////////////////////////////////////////
// setup kue
kue.redis.createClient = function() {

  // Redis configuration settings
  var redisConfig = {
    port   :6379,
    host   :'127.0.0.1'
  };
  return redis.createClient(redisConfig.port, redisConfig.host, redisConfig.options);
};

var jobs = kue.createQueue();

var lid = guid.new();
console.log(lid);

var new_job = jobs.create('newJob', {}).save({id:lid});

new_job.on("complete", function(){
  console.log('job complete ::' + lid);
});

new_job.on('progress',function(progress){
  console.info('job progress')

});

setTimeout(function(){

  console.log('removing job', lid);
  kue.Job.get(lid,function(err,job){
   if (job){
    job.remove();
   }});
},5000);


kue.app.listen(13005);

