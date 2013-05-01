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

  it('should set the timeout', function(done){
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
});

