var request = require('supertest');
var kue = require('../index');
var app = kue.app;

function jobsPopulate(type, count) {
	var priority = [10, 0 , -5, -10, -15];
	var jobs = [];
	for (var i = 0; i < count; i++) {
		jobs.push({
			type: type,
			data: {
				title: i,
				data: 'test'
			},
			options: {
				// random priority
				priority: priority[Math.floor(Math.random() * 5)]
			}
		});
	}

	// return array only if length > 1
	return jobs.length === 1 ? jobs[0] : jobs;
}


describe('JSON API', function() {

	describe('Create jobs', function() {
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

		it('should insert a job and respond with an id', function (done) {
			request(app)
				.post('/job')
				.send(jobsPopulate('insert a job', 1))
				.expect(200)
				.expect(function(res) {
					res.body.id.should.be.an.instanceOf(Number);
				})
				.end(done);
		});

		it('should insert multiple jobs and respond with ids', function(done) {
			var jobCount = Math.floor(Math.random()) * 10 + 2;
			request(app)
				.post('/job')
				.send(jobsPopulate('insert jobs', jobCount))
				.expect(200)
				.expect(function(res) {
					res.body.id.length.should.equal(jobCount);
				})
				.end(done);
		});

		it('should insert jobs including an invaild job, respond with ids and error', function(done) {
			var jobCount = Math.floor(Math.random()) * 10 + 2;
			var jobs = jobsPopulate('insert jobs including error', jobCount);
			delete jobs[1].type;
			request(app)
				.post('/job')
				.send(jobs)
				.expect(200)
				.expect(function(res) {
					res.body.id.length.should.equal(jobCount);
					res.body.id[1].error.should.equal('Must provide job type');
				})
				.end(done);
		});
	});

});
