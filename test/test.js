var kue = require('../');

describe('JOBS', function() {

  var jobs = null;

  beforeEach(function( done ) {
    jobs = kue.createQueue({ promotion: { interval: 100 } });
    done();
  });

  afterEach(function( done ) {
    jobs.shutdown(50, function() {
      done()
    });
  });

  it('should be processed', function( done ) {
    var jobData = {
      title: 'welcome email for tj',
      to: '"TJ" <tj@learnboost.com>',
      template: 'welcome-email'
    };
    jobs.create('email-should-be-processed', jobData).priority('high').save();
    jobs.process('email-should-be-processed', function( job, jdone ) {
      job.data.should.be.eql(jobData);
      job.log('<p>This is <span style="color: green;">a</span> formatted log<p/>');
      jdone();
      done();
    });
  });

  it('should retry on failure if attempts is set', function( testDone ) {
    var job      = jobs.create('failure-attempts', {});
    var failures = 0;
    job.attempts(5)
      .on('complete', function() {
        attempts.should.be.equal(5);
        failures.should.be.equal(4);
        testDone();
      })
      .on('failed attempt', function( attempt ) {
        failures++;
      })
      .save();
    var attempts = 0;
    jobs.process('failure-attempts', function( job, done ) {
      attempts++;
      if( attempts == 5 )
        done();
      else
        done(new Error("error"));
    });
  });

  it('should accept url strings for redis when making an new queue', function( done ) {
    var jobs = new kue({
      redis: 'redis://localhost:6379/?foo=bar'
    });

    jobs.client.connectionOption.port.should.be.eql(6379);
    jobs.client.connectionOption.host.should.be.eql('localhost');
    jobs.client.options.foo.should.be.eql('bar');

    var jobData = {
      title: 'welcome email for tj',
      to: '"TJ" <tj@learnboost.com>',
      template: 'welcome-email'
    };
    jobs.create('email-should-be-processed-2', jobData).priority('high').save();
    jobs.process('email-should-be-processed-2', function( job, jdone ) {
      job.data.should.be.eql(jobData);
      job.log('<p>This is <span style="color: green;">a</span> formatted log<p/>');
      jdone();
      done();
    });
  });
});
