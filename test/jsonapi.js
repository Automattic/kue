var request = require('supertest'),
  kue = require('../index'),
  app = kue.app;


function jobsPopulate(type, count) {
  var priority = [10, 0, -5, -10, -15],
    jobs = [];
  
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

    beforeEach(function(done) {
      jobs = kue.createQueue();
      jobs.promote(1);
      done();
    });

    afterEach(function(done) {
      jobs.shutdown(function(err) {
        jobs = null;
        done();
      }, 500);
    });


    it('should insert a job and respond with an id', function(done) {
      request(app)
        .post('/job')
        .send(jobsPopulate('insert a job', 1))
        .expect(200)
        .expect(function(res) {
          res.body.message.should.equal('job created');
          res.body.id.should.be.a.Number;
          Object.keys(res.body).should.have.lengthOf(2);
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
          var created = res.body;
          created.should.be.ok;
          created.length.should.equal(jobCount);
          for (var i = 0; i < jobCount; i++) {
            var job = created[i];
            job.message.should.be.equal('job created')
            job.id.should.be.a.Number
            Object.keys(job).should.have.lengthOf(2);
          }
        })
        .end(done);
    });


    it('should insert jobs including an invaild job, respond with ids and error', function(done) {
      var jobs = jobsPopulate('insert jobs including error', 3);
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
