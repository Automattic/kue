var kue = require('../'),
  queue = kue.createQueue(),
  expect = require('chai').expect;

describe('Test Mode', function() {
  context('when enabled', function() {
    before(function() { queue.testMode.enter(); });
    afterEach(function() { queue.testMode.clear(); });

    describe('#save', function() {
      it('adds jobs to an array in memory', function() {
        var job = queue.createJob('myJob', { foo: 'bar' }).save();
        var jobs = queue.testMode.jobs;
        expect(jobs.length).to.equal(1);
        expect(jobs[0]).to.equal(job);
      });

      it('adds an auto incrementing ID', function() {
        var job = queue.createJob('myJob', { first: true }).save();
        var anotherJob = queue.createJob('myJob', { first: false }).save();
        expect(job.id).to.equal(0);
        expect(anotherJob.id).to.equal(1);
      });

      it('sets the timestamps', function() {
        var job = queue.createJob('myJob', {}).save();
        expect(job.created_at).to.exist;
        expect(job.promote_at).to.exist;
        expect(job.updated_at).to.exist;
      });
    });

    describe('#update', function() {
      it('touches the updated_at timestamps', function(done) {
        var job = queue.createJob('myJob', {}).save();
        var oldTimestamp = job.updated_at;

        setTimeout(function () {
          expect(job.update().updated_at).to.be.greaterThan(oldTimestamp);
          done();
        }, 1);
      });
    });

    describe('#clear', function() {
      it('resets the list of jobs', function() {
        queue.createJob('myJob', { foo: 'bar' }).save();
        queue.testMode.clear();

        var jobs = queue.testMode.jobs;
        expect(jobs.length).to.equal(0);
      });
    });
  });

  context('when disabled', function() {
    before(function() {
      // Simulate entering and exiting test mode to ensure
      // state is restored correctly.
      queue.testMode.enter();
      queue.testMode.exit();
    });

    it('processes jobs regularly', function(done) {
      queue.createJob('myJob', { foo: 'bar' }).save();

      var jobs = queue.testMode.jobs;
      expect(jobs.length).to.equal(0);

      queue.process('myJob', function (job, jdone) {
        expect(job.data).to.eql({ foo: 'bar' });
        jdone();
        done();
      });
    });
  });
});
