
/**
 * Module dependencies.
 */

var Queue = require('../')
  , queue = new Queue
  , Job = Queue.Job
  , redis = require('redis')
  , client = redis.createClient()
  , should = require('should');

module.exports = {
  setup: function(done){
    client.flushdb(done);
  },

  'version': function(){
    Queue.version.should.match(/^\d+\.\d+\.\d+$/);
  },
  
  'Job.get()': function(done){
    queue.createJob('email', { to: 'tj@test.com' })
    .save(function(err, id){
      should.equal(null, err);
      Job.get(id, function(err, job){
        should.equal(null, err);
        job.type.should.equal('email');
        job.data.should.eql({ to: 'tj@test.com' });
        job.state.should.equal('inactive');
        done();
      });
    });
  }
};