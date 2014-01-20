/*
 var kue = require('../'),
 jobs = kue.createQueue();
 var should = require('should');
 jobs.promote(1);


 arraysAlmostEql = function (obj1, obj2) {
 if (obj1.length != obj2.length) {
 return false;
 }
 for (var i = 0; i < obj1.length; i++) {
 expected = obj1[i];
 current = obj2[i];
 if (!(
 ((expected - 100) < current) && (current < (expected + 100)))) {
 return false;
 }
 }
 return true;
 }

 should.Assertion.prototype.arraysAlmostEql = function (val, desc) {
 this.assert(
 arraysAlmostEql(val, this.obj), function () {
 return 'expected ' + this.inspect + ' to equal ' + (val) + (desc ? " | " + desc : "")
 }, function () {
 return 'expected ' + this.inspect + ' to not equal ' + (val) + (desc ? " | " + desc : "")
 }, val, true);
 return this;
 },

 */

describe('Jobs', function () {

    beforeEach(function (done) {
        done();
    });

    afterEach(function (done) {
        done();
    });

    it("test setup should be working", function () {
        true.should.be.ok;
    });

    /*it('should be processed', function (done) {
     var jobData = {
     title: 'welcome email for tj',
     to: 'tj@learnboost.com',
     template: 'welcome-email'
     };
     jobs.create('email', jobData).priority('high').save();
     var processedJobsData = []
     jobs.process('email', function (job, jdone) {
     processedJobsData.push(job.data);
     jdone();
     });
     setTimeout(function () {
     processedJobsData.length.should.be.equal(1);
     processedJobsData[0].should.be.eql(jobData);
     done();
     }, 400);
     });*/

    /*it('should retry on failure if attempts is set', function (done) {
     jobs.create('failure-attempts', {}).attempts(5).save();
     var attempts = 0
     jobs.process('failure-attempts', function (job, done) {
     attempts += 1;
     done(new Error("error"));
     });
     setTimeout(function () {
     attempts.should.be.equal(5);
     done();
     }, 800);
     })


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