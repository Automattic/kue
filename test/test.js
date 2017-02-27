var kue = require( '../' );

describe('CONNECTION', function(){
	var jobs = null;

	afterEach( function ( done ) {
		jobs.shutdown( 50, function () {
			done()
		} );
	} );

  it( 'should configure properly with string', function ( done ) {
	  jobs = new kue( {
		  redis: 'redis://localhost:6379/15?foo=bar'
	  } );

	  jobs.client.options.port.should.be.eql( 6379 );
	  jobs.client.options.host.should.be.eql( 'localhost' );
	  jobs.client.options.foo.should.be.eql( 'bar' );

	  var jobData = {
		  title: 'welcome email for tj',
		  to: '"TJ" <tj@learnboost.com>',
		  template: 'welcome-email'
	  };
	  jobs.create( 'email-should-be-processed-3', jobData ).priority( 'high' ).save();
	  jobs.process( 'email-should-be-processed-3', function ( job, jdone ) {
		  job.data.should.be.eql( jobData );
		  job.log( '<p>This is <span style="color: green;">a</span> formatted log<p/>' );
		  // Needs to be here to support the async client.select statement where the return happens sync but the call is async
		  jobs.client.selected_db.should.be.eql(15);
		  jdone();
		  done();
	  } );
  });

	it( 'should configure properly with dictionary', function ( done ) {
		jobs = new kue( {
			redis: {
				host: 'localhost',
				port: 6379,
				db: 15,
				options: {
					foo: 'bar'
				}
			}
		} );

		jobs.client.options.port.should.be.eql( 6379 );
		jobs.client.options.host.should.be.eql( 'localhost' );
		jobs.client.options.foo.should.be.eql( 'bar' );

		var jobData = {
			title: 'welcome email for tj',
			to: '"TJ" <tj@learnboost.com>',
			template: 'welcome-email'
		};
		jobs.create( 'email-should-be-processed-4', jobData ).priority( 'high' ).save();
		jobs.process( 'email-should-be-processed-4', function ( job, jdone ) {
			job.data.should.be.eql( jobData );
			job.log( '<p>This is <span style="color: green;">a</span> formatted log<p/>' );
			// Needs to be here to support the async client.select statement where the return happens sync but the call is async
			jobs.client.selected_db.should.be.eql(15);
			jdone();
			done();
		} );
	});

	it( 'should default to 0 db with string', function ( done ) {
		var jobs = new kue( {
			redis: 'redis://localhost:6379/?foo=bar'
		} );

		jobs.client.options.port.should.be.eql( 6379 );
		jobs.client.options.host.should.be.eql( 'localhost' );
		jobs.client.options.foo.should.be.eql( 'bar' );

		var jobData = {
			title: 'welcome email for tj',
			to: '"TJ" <tj@learnboost.com>',
			template: 'welcome-email'
		};
		jobs.create( 'email-should-be-processed-5', jobData ).priority( 'high' ).save();
		jobs.process( 'email-should-be-processed-5', function ( job, jdone ) {
			job.data.should.be.eql( jobData );
			job.log( '<p>This is <span style="color: green;">a</span> formatted log<p/>' );
			jobs.client.selected_db.should.be.eql(0);
			jdone();
			done();
		} );

	});

	it( 'should default to 0 db with string and no /', function ( done ) {
		var jobs = new kue( {
			redis: 'redis://localhost:6379?foo=bar'
		} );

		jobs.client.options.port.should.be.eql( 6379 );
		jobs.client.options.host.should.be.eql( 'localhost' );
		jobs.client.options.foo.should.be.eql( 'bar' );

		var jobData = {
			title: 'welcome email for tj',
			to: '"TJ" <tj@learnboost.com>',
			template: 'welcome-email'
		};
		jobs.create( 'email-should-be-processed-6', jobData ).priority( 'high' ).save();
		jobs.process( 'email-should-be-processed-6', function ( job, jdone ) {
			job.data.should.be.eql( jobData );
			job.log( '<p>This is <span style="color: green;">a</span> formatted log<p/>' );
			jobs.client.selected_db.should.be.eql(0);
			jdone();
			done();
		} );

	});

	it( 'should configure properly with dictionary', function ( done ) {
		jobs = new kue( {
			redis: {
				host: 'localhost',
				port: 6379,
				options: {
					foo: 'bar'
				}
			}
		} );

		jobs.client.options.port.should.be.eql( 6379 );
		jobs.client.options.host.should.be.eql( 'localhost' );
		jobs.client.options.foo.should.be.eql( 'bar' );

		var jobData = {
			title: 'welcome email for tj',
			to: '"TJ" <tj@learnboost.com>',
			template: 'welcome-email'
		};
		jobs.create( 'email-should-be-processed-7', jobData ).priority( 'high' ).save();
		jobs.process( 'email-should-be-processed-7', function ( job, jdone ) {
			job.data.should.be.eql( jobData );
			job.log( '<p>This is <span style="color: green;">a</span> formatted log<p/>' );
			// Needs to be here to support the async client.select statement where the return happens sync but the call is async
			jobs.client.selected_db.should.be.eql(0);
			jdone();
			done();
		} );
	});
});

describe( 'JOBS', function () {

  var jobs = null;

  beforeEach( function ( done ) {
    jobs = kue.createQueue( { promotion: { interval: 100 } } );
    done();
  } );

  afterEach( function ( done ) {
    jobs.shutdown( 50, function () {
      done()
    } );
  } );

  it( 'should be processed', function ( done ) {
    var jobData = {
      title: 'welcome email for tj',
      to: '"TJ" <tj@learnboost.com>',
      template: 'welcome-email'
    };
    jobs.create( 'email-should-be-processed', jobData ).priority( 'high' ).save();
    jobs.process( 'email-should-be-processed', function ( job, jdone ) {
      job.data.should.be.eql( jobData );
      job.log( '<p>This is <span style="color: green;">a</span> formatted log<p/>' );
      jdone();
      done();
    } );
  } );


  it('should prevent duplicate jobs based on a specific arg when #unique is used with params', function (done) {
    var jobData1 = {resource: 'users', action: 'count'};
    var jobData2 = {resource: 'groups', action: 'count'};

    // Enqueueing dup jobs with the same id
    // The example here is a job to "get the latest user counts", a job which is pointless to rerun back-to-back
    var uniqueJobs = [];
    var numDone = 0;
    var numProcessed = 0;

    uniqueJobs.push(jobs.create('unique-job-example-args', jobData1).unique('resource').removeOnComplete(true).save(checkDone));
    uniqueJobs.push(jobs.create('unique-job-example-args', jobData1).unique('resource').removeOnComplete(true).save(checkDone));

    uniqueJobs.push(jobs.create('unique-job-example-args', jobData2).unique('resource').removeOnComplete(true).save(checkDone));
    uniqueJobs.push(jobs.create('unique-job-example-args', jobData2).unique('resource').removeOnComplete(true).save(checkDone));

    function checkDone(err) {
      // should.not.exist(err);
      if(err) throw new Error('Error saving unique job (couldnt get should.not.exist(err) to work) - ' + err.message);
      if(++numDone < uniqueJobs.length) return; // don't verify status yet

      kue.Job.rangeByType('unique-job-example-args', 'inactive', 0, 100, 'asc', function (err, ids) {
        ids.should.have.length(2); // job for 'users' and 'groups'

        // Verify it cleans up after itself
        jobs.process('unique-job-example-args', function (job, jdone) {
          job.uniqKey.should.include('unique-job-example-args');
          jdone(); // this should trigger the HMAP to be cleaned up
          if(++numProcessed < 2) return;

          setTimeout(function () {
            jobs.client.hkeys(jobs.client.getKey('jobs:unique'), function (err, keys) {
              if(err) throw new Error('Error checking unique job cleanup (couldnt get should.not.exist(err) to work) - ' + err.message);

              keys.should.have.length(0);
              done();
            });
          }, 10);
        });
      });
    }
  });

  it('should prevent duplicate jobs based on all args when #unique is used without params', function (done) {
    var jobData = { resource: 'users', action: 'count' };

    // Enqueueing dup jobs with the same id
    // The example here is a job to "get the latest user counts", a job which is pointless to rerun back-to-back
    var uniqueJobs = [];
    var numDone = 0;
    uniqueJobs.push(jobs.create('unique-job-example-noargs', jobData).unique().removeOnComplete(true).save(checkDone));
    uniqueJobs.push(jobs.create('unique-job-example-noargs', jobData).unique().removeOnComplete(true).save(checkDone));
    uniqueJobs.push(jobs.create('unique-job-example-noargs', jobData).unique().removeOnComplete(true).save(checkDone));
    uniqueJobs.push(jobs.create('unique-job-example-noargs', jobData).unique().removeOnComplete(true).save(checkDone));

    function checkDone(err) {
      // should.not.exist(err);
      if(err) throw new Error('Error saving unique job (couldnt get should.not.exist(err) to work) - ' + err.message);
      if (++numDone < uniqueJobs.length) return; // don't verify status yet

      kue.Job.rangeByType('unique-job-example-noargs', 'inactive', 0, 100, 'asc', function (err, ids) {
        ids.should.have.length(1); // if there are more than 1, unique didn't work

          // Verify it cleans up after itself
        jobs.process('unique-job-example-noargs', function (job, jdone) {
          job.uniqKey.should.include('unique-job-example-noargs');
          jdone(); // this should trigger the HMAP to be cleaned up

          setTimeout(function () {
            jobs.client.hkeys(jobs.client.getKey('jobs:unique'), function (err, keys) {
              if(err) throw new Error('Error checking unique job cleanup (couldnt get should.not.exist(err) to work) - ' + err.message);

              keys.should.have.length(0);
              done();
            });
          }, 10);
        });
      });
    }
  });

  it( 'should retry on failure if attempts is set', function ( testDone ) {
    var job      = jobs.create( 'failure-attempts', {} );
    var failures = 0;
    job.attempts( 5 )
      .on( 'complete', function () {
        attempts.should.be.equal( 5 );
        failures.should.be.equal( 4 );
        testDone();
      } )
      .on( 'failed attempt', function ( attempt ) {
        failures++;
      } )
      .save();
    var attempts = 0;
    jobs.process( 'failure-attempts', function ( job, done ) {
      attempts++;
      if ( attempts == 5 )
        done();
      else
        done( new Error( "error" ) );
    } );
  } );

  it( 'should accept url strings for redis when making an new queue', function ( done ) {
    var jobs = new kue( {
      redis: 'redis://localhost:6379/?foo=bar'
    } );

    jobs.client.options.port.should.be.eql( 6379 );
    jobs.client.options.host.should.be.eql( 'localhost' );
    jobs.client.options.foo.should.be.eql( 'bar' );

    var jobData = {
      title: 'welcome email for tj',
      to: '"TJ" <tj@learnboost.com>',
      template: 'welcome-email'
    };
    jobs.create( 'email-should-be-processed-2', jobData ).priority( 'high' ).save();
    jobs.process( 'email-should-be-processed-2', function ( job, jdone ) {
      job.data.should.be.eql( jobData );
      job.log( '<p>This is <span style="color: green;">a</span> formatted log<p/>' );
      jdone();
      done();
    } );
  } );
} );
