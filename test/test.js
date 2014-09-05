var kue = require('../');

describe('Jobs', function () {

    var jobs = null;

    beforeEach(function (done) {
        jobs = kue.createQueue();
        jobs.promote(1);
        done();
    });

    afterEach(function (done) {
        jobs.shutdown( function( err ){
          jobs = null;
          done();
        }, 500 );
    });

    it('should be processed', function (done) {
        var jobData = {
            title: 'welcome email for tj',
            to: '"TJ" <tj@learnboost.com>',
            template: 'welcome-email'
        };
        jobs.create('email-should-be-processed', jobData).priority('high').save();
        jobs.process('email-should-be-processed', function (job, jdone) {
            job.data.should.be.eql(jobData);
            job.log( '<p>This is <span style="color: green;">a</span> formatted log<p/>' );
            jdone();
            done();
        });
    });

    it('should catch uncatched exception and mark job as failed', function(testDone) {
        jobs.create('failedJob', {}).on('complete', function() {
            throw new Error('Job should be marked as failed and not complete');
        }).on('failed', function() {
            testDone();
        }).save();

        jobs.process('failedJob', 1, function() {
            throw new Error('toto');
        });
    });

    it('should retry on failure if attempts is set', function (testDone) {
        var job = jobs.create('failure-attempts', {});
        var failures = 0;
        job.attempts(5)
            .on('complete', function(){
                attempts.should.be.equal(5);
                failures.should.be.equal(4);
                testDone();
            })
            .on('failed attempt', function( attempt ){
                failures++;
            })
            .save();
        var attempts = 0;
        jobs.process('failure-attempts', function (job, done) {
            attempts++;
            if( attempts == 5 )
                done();
            else
                done(new Error("error"));
        });
    });

    /*
     it('should delay retries on failure if attempts and delay is set', function (done) {
     this.timeout(20000);
     jobs.create('failure-attempts-delay', {}).delay(1000).attempts(5).attemptsDelay(100).save();
     var delays = []
     jobs.process('failure-attempts-delay', function (job, done) {
     delays.push((new Date()) - job.created_at);
     done(new Error("error"));
     });
     jobs.promote(1);
     setTimeout(function () {
     delays.should.arraysAlmostEql([1000, 1100, 1200, 1300, 1400]);
     done();
     }, 1500);
     })

     it('should fire up retries right away on failure if attemptsDelay is nil', function (done) {
     this.timeout(20000);
     jobs.create('failure-attempts-without-delay', {}).delay(1000).attempts(5).save();
     var delays = []
     jobs.process('failure-attempts-without-delay', function (job, done) {
     delays.push((new Date()) - job.created_at);
     done(new Error("error"));
     });
     jobs.promote(1);
     setTimeout(function () {
     delays.should.arraysAlmostEql([1000, 1000, 1000, 1000, 1000]);

     done();
     }, 1500);
     })

     it.only('should fire all events properly', function (done) {
     this.timeout(60000);
     var job = jobs.create('failure-attempts-delay-change-on-event', {}).attempts(5).attemptsDelay(100);
     var delays = [];
     var completes = [];
     var failed = [];
     job.save();
     var start = new Date();


     job.on('complete',function () {
     completes.push((new Date()) - start);
     }).on('failed', function () {
     failed.push((new Date()) - start);

     });
     jobs.process('failure-attempts-delay-change-on-event', function (job, done) {
     delays.push((new Date()) - start);
     if (delays.length == 4) {
     done()
     } else {
     done(new Error("error"));
     }
     job.attemptsDelay(job.attemptsDelay() * 2);
     });
     jobs.promote(1);
     setTimeout(function () {
     delays.should.arraysAlmostEql(failed.concat(completes));
     delays.should.arraysAlmostEql([10, 200, 600, 1400]);
     done();
     }, 3000);
     })*/


});
