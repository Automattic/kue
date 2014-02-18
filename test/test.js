var kue = require('../'),
    jobs = kue.createQueue();

jobs.promote(1);

describe('Jobs', function () {

    beforeEach(function (done) {
        done();
    });

    afterEach(function (done) {
        done();
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

    it('should retry on failure if attempts is set', function (done) {
        var job = jobs.create('failure-attempts', {});
        job.attempts(5)
            .on('complete', function(){
                console.log( "job complete");
            })
            .on('failed', function(){
                console.log( "job failed");
            })
            .on('failed attempt', function( attempt ){
                console.log( "failed attempt ", attempt );
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
        setTimeout(function () {
            attempts.should.be.equal(5);
            done();
        }, 1000 );
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