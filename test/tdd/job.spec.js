var sinon = require('sinon');
var kue = require('../../lib/kue');
var Job = require('../../lib/queue/job');
var Worker = require('../../lib/queue/worker');
var _ = require('lodash');

describe('Job', function () {
  var queue = null;
  var job = null;

  beforeEach(function () {
    queue = kue.createQueue({promotion:{interval:50}});
    job = queue.create('test-job')
  });

  afterEach(function (done) {
    queue.shutdown(50, done);
  });

  describe('Funtion: create', function () {

    it('should have priority normal by default', function () {
      job._priority.should.be = Job.priorities['normal'];
    })

  });

  describe('Function: priority', function () {

    it('should be settable for all numbers in range ' + Job.minPriority + ' to ' + Job.maxPriority, function () {
      for(var i = Job.minPriority; i <= Job.maxPriority; i++){
        job.priority(i);
        job._priority.should.be = i;
      }
    })

    it('should be settable for all values in priority map', function () {
      for(var prio in Job.priorities){
        job.priority(prio);
        job._priority.should.be = Job.priorities[prio];
      }
    })

    it('should throw error if level is out of range', function () {
      (() => {job.priority(Job.minPriority - 1)}).should.throw();
      (() => {job.priority(Job.maxPriority + 1)}).should.throw();
    })

    it('should throw error if level is not a number and not an member of Job.priorities', function () {
      (() => {job.priority('acbd1234')}).should.throw();
      (() => {job.priority(undefined)}).should.throw();
      (() => {job.priority(null)}).should.throw();
    })


  });

});
