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
