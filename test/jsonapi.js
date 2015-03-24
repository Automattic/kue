var request = require('supertest'),
  kue = require('../index'),
  async = require('async'),
  chai = require('chai'),
  queue = kue.createQueue({disableSearch:false}), //customize queue before accessing kue.app
  app = kue.app,
  type = 'test:inserts';


expect = chai.expect;


function jobsPopulate(count) {
  var priority = [10, 0, -5, -10, -15],
    jobs = [];

  for (var i = 0; i < count; i++) {
    jobs.push({
      type: type,
      data: {
        title: i,
        data: type + ':data'
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
  var scope = {};


  before(function(done) {
    scope.queue = queue;

    // delete all jobs to get a clean state
    kue.Job.rangeByType(type, 'inactive', 0, 100, 'asc', function(err, jobs) {
      if (err) return done(err);
      if (!jobs.length) return done();
      async.each(jobs, function(job, asyncDone) {
        job.remove(asyncDone);
      }, done);
    });
  });


  after(function(done) {
    scope.queue.shutdown(200, function(err) {
      scope.queue = null;
      done(err);
    });
  });


  describe('create, get, update and delete', function() {
    it('should insert a job and respond with an id', function(done) {
      request(app)
        .post('/job')
        .send(jobsPopulate(1))
        .expect(200)
        .expect(function(res) {
          res.body.message.should.equal('job created');
          res.body.id.should.be.a.Number;
          Object.keys(res.body).should.have.lengthOf(2);

          scope.jobId = res.body.id;
        })
        .end(done);
    });


    it('should insert multiple jobs and respond with ids', function(done) {
      var jobCount = 5;

      request(app)
        .post('/job')
        .send(jobsPopulate(jobCount))
        .expect(200)
        .expect(function(res) {
          var created = res.body;
          created.should.be.ok;
          created.length.should.equal(jobCount);

          for (var i = 0; i < jobCount; i++) {
            var job = created[i];
            job.message.should.be.equal('job created');
            job.id.should.be.a.Number;
            Object.keys(job).should.have.lengthOf(2);
          }
        })
        .end(done);
    });


    it('get job by id: job is inactive', function(done) {
      request(app)
        .get('/job/' + scope.jobId)
        .expect(function(res) {
          res.body.id.should.eql(scope.jobId);
          res.body.type.should.eql(type);
          res.body.state.should.eql('inactive');
        })
        .end(done);
    });


    it('change state', function(done) {
      request(app)
        .put('/job/' + scope.jobId + '/state/active')
        .expect(function(res) {
          expect(res.body.message).to.exist;
        })
        .end(done);
    });


    it('get job by id: job is now active', function(done) {
      request(app)
        .get('/job/' + scope.jobId)
        .expect(function(res) {
          res.body.id.should.eql(scope.jobId);
          res.body.type.should.eql(type);
          res.body.state.should.eql('active');
        })
        .end(done);
    });


    it('delete job by id', function(done) {
      request(app)
        .del('/job/' + scope.jobId)
        .expect(function(res) {
          expect(res.body.message).to.contain(scope.jobId);
        })
        .end(done);
    });
  });


  describe('search', function() {
    it('search by query: not found', function(done) {
      request(app)
        .get('/job/search')
        .query({})
        .expect(function(res) {
          res.body.length.should.eql(0);
        })
        .end(done);
    });


    it('search by query: found', function(done) {
      request(app)
        .get('/job/search')
        .query({
          q: type + ':data'
        })
        .expect(function(res) {
          // we created 6 jobs, one was deleted, 5 left
          res.body.length.should.eql(5);
        })
        .end(done);
    });
  });


  describe('range', function() {
    it('range from...to', function(done) {
      request(app)
        .get('/jobs/0..3')
        .expect(function(res) {
          res.body.length.should.eql(4);
        })
        .end(done);
    });


    it('range from...to with type and state', function(done) {
      request(app)
        .get('/jobs/' + type + '/inactive/0..20/asc')
        .expect(function(res) {
          res.body.length.should.eql(5);
        })
        .end(done);
    });
  });


  describe('stats', function() {
    it('get stats', function(done) {
      request(app)
        .get('/stats')
        .expect(function(res) {
          expect(res.body.inactiveCount).to.exist;
          expect(res.body.completeCount).to.exist;
          expect(res.body.activeCount).to.exist;
          expect(res.body.delayedCount).to.exist;
        })
        .end(done);
    });
  });


  describe('error cases', function() {
    it('should insert jobs including an invalid job, respond with ids and error', function(done) {
      var jobs = jobsPopulate(3);
      delete jobs[1].type;

      request(app)
        .post('/job')
        .send(jobs)
        .expect(400) // Expect a bad request
        .expect(function(res) {
          var created = res.body;

          created.should.be.ok;
          created.length.should.equal(2); // the second one failed

          // The first one succeeded
          created[0].message.should.be.equal('job created');
          created[0].id.should.be.a.Number;
          Object.keys(created[0]).should.have.lengthOf(2);

          // The second one failed
          created[1].error.should.equal('Must provide job type');
          Object.keys(created[1]).should.have.lengthOf(1);
        })
        .end(done);
    });
  });
});
