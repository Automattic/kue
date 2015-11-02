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

      it('emits the `enqueue` event on the job', function(done) {
        var job = queue.createJob('myJob', {});
        job.on('enqueue', function() {
          done();
        });
        job.save();
      });

      it('emits the `job enqueue` event on the queue', function(done) {
        var job = queue.createJob('myJob', {});
        queue.on('job enqueue', function(id, type) {
          expect(id).to.eq(job.id);
          expect(type).to.eq('myJob');
          done();
        });
        job.save();
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

    describe('#process', function() {
      it('provide the job to the worker', function(done) {
        var expectedJob = queue.createJob('myJob', { foo: 'bar' });

        queue.process('myJob', function(jobFromQueue, jdone) {
          expect(jobFromQueue).to.equal(expectedJob);
          jdone();
          done();
        });

        expectedJob.save();
      });

      it('provides a done function to return a result', function(done) {
        var job = queue.createJob('myJob', { foo: 'bar' });

        queue.process('myJob', function(jobFromQueue, jdone) {
          jdone(null, { done: true });
          expect(job.result.done).to.be.true;
          done();
        });

        job.save();
      });

      it('emits the `complete` event on the job', function(done) {
        var job = queue.createJob('myJob', { foo: 'bar' });

        job.on('complete', function(result) {
          expect(result.done).to.be.true;
          done();
        });

        queue.process('myJob', function(jobFromQueue, jdone) {
          jdone(null, { done: true });
        });

        job.save();
      });

      it('emits the `job complete` event on the queue', function(done) {
        var job = queue.createJob('myJob', { foo: 'bar' });

        queue.on('job complete', function(id, result) {
          expect(id).to.eq(job.id);
          expect(result.done).to.be.true;
          done();
        });

        queue.process('myJob', function(jobFromQueue, jdone) {
          jdone(null, { done: true });
        });

        job.save();
      });

      it('emits the `failed` event on the job', function(done) {
        var job = queue.createJob('myJob', { foo: 'bar' });

        job.on('failed', function(errorMesage) {
          expect(errorMesage).to.equal('something went terribly wrong');
          done();
        });

        queue.process('myJob', function(jobFromQueue, jdone) {
          jdone(new Error('something went terribly wrong'));
        });

        job.save();
      });

      it('emits the `job failed` event on the job', function(done) {
        var job = queue.createJob('myJob', { foo: 'bar' });

        queue.on('job failed', function(id, errorMesage) {
          expect(id).to.equal(job.id);
          expect(errorMesage).to.equal('something went terribly wrong');
          done();
        });

        queue.process('myJob', function(jobFromQueue, jdone) {
          jdone(new Error('something went terribly wrong'));
        });

        job.save();
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
