var kue = require('../'),
    _ = require('lodash');

describe('Test Mode', function() {
    // Moved queue creation in before as it's a singleton.
    // Indeed, when shut down, this.client is set to null,
    // hence we want a fresh instance for disabled mode.
    var queue;

    before(function () {
        queue = kue.createQueue();
    });

    after(function (done) {
        queue.shutdown(50, function() {
            done();
        });
    });

    context('when enabled', function() {
        before(function() {
            queue.testMode.enter();
        });

        afterEach(function() {
            queue.testMode.clear();
        });

        it('adds jobs to an array in memory', function() {
            queue.createJob('myJob', { foo: 'bar' }).save();

            var jobs = queue.testMode.jobs;
            expect(jobs.length).to.equal(1);

            var job = _.last(jobs);
            expect(job.type).to.equal('myJob');
            expect(job.data).to.eql({ foo: 'bar' });
        });

        it('adds jobs to an array in memory and processes them when processQueue is true', function(done) {
            queue.testMode.exit();
            queue.testMode.enter(true);

            queue.createJob('test-testMode-process', { foo: 'bar' }).save();

            var jobs = queue.testMode.jobs;
            expect(jobs.length).to.equal(1);

            var job = _.last(jobs);
            expect(job.type).to.equal('test-testMode-process');
            expect(job.data).to.eql({ foo: 'bar' });

            job.on('complete', function() {
                queue.testMode.exit();
                queue.testMode.enter();
                done();
            });

            queue.process('test-testMode-process', function(job, jdone) {
                job.data.should.be.eql({ foo: 'bar' });

                jdone();
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
