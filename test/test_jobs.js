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


  it('should delay retries on failure if attempts and delay is set', function(done){
      this.timeout(20000);
      jobs.create('failure-attempts-delay', jobData).delay(1000).attempts(5).attemptsDelay(100).save();
      delays = []
      jobs.process('failure-attempts-delay', function(job, done){
        delays.push((new Date()) - job.created_at);
        done(new Error("error"));
      });
      jobs.promote(1);
      setTimeout(function(){
        console.error(delays);
        delays.length.should.be.equal(5);
        delays[0].should.be.above(1000);
        delays[0].should.be.below(1090)
        delays[1].should.be.above(1100);
        delays[1].should.be.below(1190);
        delays[4].should.be.above(1400);
        delays[4].should.be.below(1490);
        done();
      },1500);
  })

  it('should fire up retries right away on failure if attemptsDelay is nil', function(done){
      this.timeout(20000);
      jobs.create('failure-attempts-without-delay', jobData).delay(1000).attempts(5).save();
      delays = []
      jobs.process('failure-attempts-without-delay', function(job, done){
        delays.push((new Date()) - job.created_at);
        done(new Error("error"));
      });
      jobs.promote(1);
      setTimeout(function(){
        console.error(delays);
        delays.length.should.be.equal(5);
        delays[0].should.be.above(1000);
        delays[0].should.be.below(1090)
        delays[1].should.be.above(1000);
        delays[1].should.be.below(1090);
        delays[4].should.be.above(1000);
        delays[4].should.be.below(1090);
        done();
      },1500);
  })



});

