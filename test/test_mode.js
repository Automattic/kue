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
