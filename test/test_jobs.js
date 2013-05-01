var kue = require('../')
  , jobs = kue.createQueue();

describe('Jobs', function(){

  beforeEach(function(done){
    jobs.client.flushall(function (err, res) {
      done();
    });
  })

  afterEach(function(done){
    jobs.client.flushall(function (err, res) {
      done();
    });

  })

  it('should be processed', function(done){
      jobData = {
          title: 'welcome email for tj'
        , to: 'tj@learnboost.com'
        , template: 'welcome-email'
      };
      jobs.create('email', jobData).priority('high').save();
      processedJobsData = []
      jobs.process('email', function(job, done){
        processedJobsData.push(job.data);
      });
      setTimeout(function(){
        processedJobsData.length.should.be.equal(1);
        processedJobsData[0].should.be.eql(jobData);
        done();
      },400);
  })

  it('should retry on failure if attempts is set', function(done){
      jobs.create('failure-attempts', jobData).attempts(5).save();
      attempts = 0
      jobs.process('failure-attempts', function(job, done){
        attempts += 1;
        done(new Error("error"));
      });
      setTimeout(function(){
        attempts.should.be.equal(5);
        done();
      },800);
  })

});

