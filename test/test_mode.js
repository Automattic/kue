var kue = require('../'),
    _ = require('lodash'),
    chai    = require( 'chai' ),
    queue = kue.createQueue();

expect = chai.expect;

describe('Test Mode', function() {
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

        it('returns the Job when saving', function() {
            var job = queue.createJob('myJob', { foo: 'bar' });
            var savedJob = job.save();
            expect(savedJob).to.equal(job);
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
