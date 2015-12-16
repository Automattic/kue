var sinon = require('sinon');
var kue = require('../../lib/kue');
var redis = require('../../lib/redis');
var events = require('../../lib/queue/events');
var Job = require('../../lib/queue/job');
var Worker = require('../../lib/queue/worker');
var _ = require('lodash');
var EventEmitter = require('events').EventEmitter;
var redisClient = {};

describe('Kue', function () {

  beforeEach(function(){
    sinon.stub(events, 'subscribe');
    sinon.stub(redis, 'configureFactory', function () {
      redis.createClient = sinon.stub();
    });
  });

  afterEach(function(){
    events.subscribe.restore();
    redis.configureFactory.restore();
  });

  describe('Function: createQueue', function () {

    it('should subscribe to queue events', function () {
      var queue = kue.createQueue();
      events.subscribe.called.should.be.true;
    });

    it('should set the correct default values', function () {
      var queue = kue.createQueue();
      queue.name.should.equal('kue');
      queue.id.should.equal([ 'kue', require("os").hostname(), process.pid ].join(':'));
      (queue.promoter === null).should.be.true;
      queue.workers.should.eql(kue.workers);
      queue.shuttingDown.should.be.false;
    });

    it('should allow a custom name option', function () {
      it('should set the correct default values', function () {
        var queue = kue.createQueue({
          name: 'name'
        });
        queue.name.should.equal('name');
      });
    });
  });

  describe('Function: create', function() {
    var queue;
    beforeEach(function(){
      queue = kue.createQueue();
    });

    it('should return a new Job instance', function () {
      var data = {
        key: 'value'
      };
      var job = queue.create('type', data);

      job.type.should.equal('type');
      job.data.should.eql(data);
    });
  });

  describe('Function: on', function() {
    var queue, noop;
    beforeEach(function(){
      queue = kue.createQueue();
      events.subscribe.reset();
      noop = function () {};
    });

    it('should subscribe to events when subscribing to the job event', function () {
      queue.on('job', noop);
      events.subscribe.called.should.be.true;
    });

    it('should proxy the event listener', function (done) {
      queue.on('event', function (data) {
        data.should.equal('data');
        done();
      });
      queue.emit('event', 'data');
    });
  });

  describe('Function: setupTimers', function() {
    var queue;
    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'checkJobPromotion');
      sinon.stub(queue, 'checkActiveJobTtl');
    });

    afterEach(function(){
      queue.checkJobPromotion.restore();
      queue.checkActiveJobTtl.restore();
    });

    it('should setup a warlock client if it is not setup yet', function () {
      queue.warlock = undefined;
      queue.setupTimers();
      queue.warlock.should.exist;
    });

    it('should call checkJobPromotion', function () {
      queue.setupTimers();
      queue.checkJobPromotion.called.should.be.true;
    });

    it('should call checkActiveJobTtl', function () {
      queue.setupTimers();
      queue.checkActiveJobTtl.called.should.be.true;
    });
  });

  describe('Function: checkJobPromotion', function() {
    var queue, unlock, clock, timeout, client, ids, job;

    beforeEach(function(){
      unlock = sinon.spy();
      timeout = 1000;
      ids = [1, 2, 3];
      client = {
        zrangebyscore: sinon.stub().callsArgWith(6, null, ids),
        getKey: sinon.stub().returnsArg(0),
        stripFIFO: sinon.stub().returnsArg(0)
      };
      job = {
        inactive: sinon.stub().callsArg(0)
      };

      queue = kue.createQueue();
      queue.client = client;

      sinon.stub(Job, 'get').callsArgWith(1, null, job);
      sinon.stub(queue.warlock, 'lock').callsArgWith(2, null, unlock);
      sinon.stub(events, 'emit');
      clock = sinon.useFakeTimers();
    });

    afterEach(function(){
      Job.get.restore();
      queue.warlock.lock.restore();
      events.emit.restore();
      clock.restore();
    });

    it('should set the promotion lock', function () {
      queue.checkJobPromotion();
      clock.tick(timeout);
      queue.warlock.lock.calledWith('promotion').should.be.true;
    });

    it('should load all delayed jobs that should be run job', function () {
      queue.checkJobPromotion();
      clock.tick(timeout);
      client.zrangebyscore.calledWith(client.getKey('jobs:delayed'), 0, sinon.match.any, "LIMIT", 0, 1000).should.be.true;
    });

    it('should get each job', function () {
      queue.checkJobPromotion();
      clock.tick(timeout);
      Job.get.callCount.should.equal(3);
      Job.get.calledWith(ids[0]).should.be.true;
      Job.get.calledWith(ids[1]).should.be.true;
      Job.get.calledWith(ids[2]).should.be.true;
    });

    it('should emit promotion for each job', function () {
      queue.checkJobPromotion();
      clock.tick(timeout);
      events.emit.callCount.should.equal(3);
      events.emit.calledWith(ids[0], 'promotion').should.be.true;
      events.emit.calledWith(ids[1], 'promotion').should.be.true;
      events.emit.calledWith(ids[2], 'promotion').should.be.true;
    });

    it('should set each job to inactive', function () {
      queue.checkJobPromotion();
      clock.tick(timeout);
      job.inactive.callCount.should.equal(3);
    });

    it('should unlock promotion', function () {
      queue.checkJobPromotion();
      clock.tick(timeout);
      unlock.calledOnce.should.be.true;
    });

  });

  describe('Function: checkActiveJobTtl', function() {
    var queue, unlock, clock, timeout, client, ids, job;

    beforeEach(function(){
      unlock = sinon.spy();
      timeout = 1000;
      ids = [1, 2, 3];
      client = {
        zrangebyscore: sinon.stub().callsArgWith(6, null, ids),
        getKey: sinon.stub().returnsArg(0),
        stripFIFO: sinon.stub().returnsArg(0)
      };
      job = {
        failedAttempt: sinon.stub().callsArg(1)
      };

      queue = kue.createQueue();
      queue.client = client;

      sinon.spy(queue, 'removeAllListeners');
      sinon.stub(Job, 'get').callsArgWith(1, null, job);
      sinon.stub(queue.warlock, 'lock').callsArgWith(2, null, unlock);
      sinon.stub(events, 'emit');
      clock = sinon.useFakeTimers();
    });

    afterEach(function(){
      queue.removeAllListeners.restore();
      Job.get.restore();
      queue.warlock.lock.restore();
      events.emit.restore();
      clock.restore();
    });

    it('should set the activeJobsTTL lock', function () {
      queue.checkActiveJobTtl();
      clock.tick(timeout);
      queue.warlock.lock.calledWith('activeJobsTTL').should.be.true;
    });

    it('should load all expired jobs', function () {
      queue.checkActiveJobTtl();
      clock.tick(timeout);
      client.zrangebyscore.calledWith(client.getKey('jobs:active'), 100000, sinon.match.any, "LIMIT", 0, 1000).should.be.true;
    });

    it('should emit ttl exceeded for each job', function () {
      queue.checkActiveJobTtl();
      clock.tick(timeout);
      events.emit.callCount.should.equal(3);
      events.emit.calledWith(ids[0], 'ttl exceeded');
      events.emit.calledWith(ids[1], 'ttl exceeded');
      events.emit.calledWith(ids[2], 'ttl exceeded');
    });

    it('should unlock after all the job ttl exceeded acks have been received', function () {
      queue.checkActiveJobTtl('job ttl exceeded ack');
      queue.checkActiveJobTtl();
      clock.tick(timeout);
      _.each(ids, function (id) {
        // calling queue.emit since queue.on does special logic for events that start with "job"
        queue.emit('job ttl exceeded ack', id);
      });
      unlock.calledOnce.should.be.true;
      queue.removeAllListeners.calledWith('job ttl exceeded ack').should.be.true;
    });

    it('should call job.failedAttempt for each job that did not receive the ack event', function () {
      queue.removeAllListeners('job ttl exceeded ack');
      queue.checkActiveJobTtl('job ttl exceeded ack');
      clock.tick(timeout);
      var id = ids.splice(0, 1)[0];
      _.each(ids, function (id) {
        // calling queue.emit since queue.on does special logic for events that start with "job"
        queue.emit('job ttl exceeded ack', id);
      });
      clock.tick(timeout);
      Job.get.calledWith(id).should.be.true;
      job.failedAttempt.calledOnce.should.be.true;
      job.failedAttempt.calledWith({
        error: true,
        message: 'TTL exceeded'
      }).should.be.true;
    });
  });

  describe('Function: watchStuckJobs', function() {
    var queue, clock, client, sha;

    beforeEach(function(){
      sha = 'sha';
      client = {
        script: sinon.stub().callsArgWith(2, null, sha),
        evalsha: sinon.stub().callsArg(2)
      };

      queue = kue.createQueue();
      queue.client = client;

      clock = sinon.useFakeTimers();
    });

    afterEach(function(){
      clock.restore();
    });

    it('should load the script', function () {
      queue.watchStuckJobs();
      client.script.calledWith('LOAD').should.be.true;
    });

    it('should run the script on an interval', function () {
      queue.watchStuckJobs();
      clock.tick(1000);
      client.evalsha.calledWith(sha, 0).should.be.true;
      client.evalsha.callCount.should.equal(1);
      clock.tick(1000);
      client.evalsha.callCount.should.equal(2);
    });

  });

  describe('Function: setting', function() {
    var queue, client;

    beforeEach(function(){
      client = {
        getKey: sinon.stub().returnsArg(0),
        hget: sinon.stub().callsArg(2)
      };

      queue = kue.createQueue();
      queue.client = client;
    });

    it('should get the requested setting', function (done) {
      queue.setting('name', function () {
        client.hget.calledWith(client.getKey('settings'), 'name').should.be.true;
        done();
      });
    });

  });

  describe('Function: process', function() {
    var queue, client, worker;

    beforeEach(function(){
      client = {
        getKey: sinon.stub().returnsArg(0),
        incrby: sinon.stub()
      };
      worker = new EventEmitter();
      queue = kue.createQueue();
      queue.workers = [];
      queue.client = client;

      sinon.stub(queue, 'setupTimers');
      sinon.stub(Worker.prototype, 'start').returns(worker);
    });

    afterEach(function(){
      queue.setupTimers.restore();
      Worker.prototype.start.restore();
    });

    it('should use 1 as the default number of workers', function () {
      queue.process('type', sinon.stub());
      Worker.prototype.start.callCount.should.equal(1);
    });

    it('should accept a number for the number of workers', function () {
      queue.process('type', 3, sinon.stub());
      Worker.prototype.start.callCount.should.equal(3);
    });

    it('should add each worker to the queue.workers array', function () {
      queue.process('type', 3, sinon.stub());
      queue.workers.length.should.equal(3);
    });

    it('should setup each worker to respond to error events', function () {
      sinon.stub(queue, 'emit');
      queue.process('type', 3, sinon.stub());
      worker.emit('error');
      queue.emit.callCount.should.equal(3);
      queue.emit.restore();
    });

    it('should setup each worker to respond to job complete events', function () {
      var job = {
        duration: 100
      };
      queue.process('type', 3, sinon.stub());
      worker.emit('job complete', job);
      client.incrby.calledWith(client.getKey('stats:work-time'), job.duration).should.be.true;
    });

    it('should setup timers', function () {
      queue.process('type', 3, sinon.stub());
      queue.setupTimers.called.should.be.true;
    });

  });

  describe('Function: shutdown', function() {
    var queue, client, worker, lockClient;

    beforeEach(function(){
      client = {
        quit: sinon.stub()
      };
      lockClient = {
        quit: sinon.stub()
      };
      worker = {
        shutdown: sinon.stub().callsArg(1)
      };
      queue = kue.createQueue();
      queue.shuttingDown = false;
      queue.workers = [worker, worker, worker];
      queue.client = client;
      queue.lockClient = lockClient;

      sinon.stub(events, 'unsubscribe');
      sinon.stub(redis, 'reset');
    });

    afterEach(function(){
      events.unsubscribe.restore();
      redis.reset.restore();
    });

    it('should return an error if it is already shutting down', function (done) {
      queue.shuttingDown = true;
      queue.shutdown(function(err){
        err.should.exist;
        done();
      });
    });

    it('should shutdown each worker', function (done) {
      queue.shutdown(function () {
        worker.shutdown.callCount.should.equal(3);
        done();
      });
    });

    it('should clean things up', function (done) {
      queue.shutdown(function () {
        queue.workers.length.should.equal(0);
        events.unsubscribe.called.should.be.true;
        redis.reset.called.should.be.true;
        client.quit.called.should.be.true;
        (queue.client == null).should.be.true;
        lockClient.quit.called.should.be.true;
        (queue.lockClient == null).should.be.true;
        done();
      });
    });

  });

  describe('Function: types', function() {
    var queue, client, types;

    beforeEach(function(){
      types = ['type1', 'type2'];
      client = {
        getKey: sinon.stub().returnsArg(0),
        smembers: sinon.stub().callsArgWith(1, null, types)
      };
      queue = kue.createQueue();
      queue.client = client;
    });

    it('should get the jobs types', function (done) {
      queue.types(function(err, tps){
        tps.should.eql(types);
        done();
      });
    });
  });

  describe('Function: state', function() {
    var queue, client, jobIds, state;

    beforeEach(function(){
      jobIds = [1, 2];
      state = 'state';
      client = {
        getKey: sinon.stub().returnsArg(0),
        stripFIFO: sinon.stub().returnsArg(0),
        zrange: sinon.stub().callsArgWith(3, null, jobIds)
      };
      queue = kue.createQueue();
      queue.client = client;
    });

    it('should get all job ids for the given state', function (done) {
      queue.state(state, function (err, ids) {
        ids.should.eql(jobIds);
        done();
      });
    });

  });

  describe('Function: workTime', function() {
    var queue, client, n;

    beforeEach(function(){
      n = 20;
      client = {
        getKey: sinon.stub().returnsArg(0),
        get: sinon.stub().callsArgWith(1, null, n)
      };
      queue = kue.createQueue();
      queue.client = client;
    });

    it('should load the worktime', function (done) {
      queue.workTime(function (err, time) {
        time.should.equal(n);
        done();
      });
    });

  });

  describe('Function: cardByType', function() {
    var queue, client, type, state, total;

    beforeEach(function(){
      type = 'type';
      state = 'state';
      total = 20;
      client = {
        getKey: sinon.stub().returnsArg(0),
        zcard: sinon.stub().callsArgWith(1, null, total)
      };
      queue = kue.createQueue();
      queue.client = client;
    });

    it('should return the total number of jobs for a given type and state', function (done) {
      queue.cardByType(type, state, function (err, card) {
        card.should.equal(total);
        done();
      });
    });
  });

  describe('function: card', function() {
    var queue, client, state, total;

    beforeEach(function(){
      state = 'state';
      total = 20;
      client = {
        getKey: sinon.stub().returnsArg(0),
        zcard: sinon.stub().callsArgWith(1, null, total)
      };
      queue = kue.createQueue();
      queue.client = client;
    });

    it('should return the total number of jobs for a given state', function (done) {
      queue.card(state, function (err, card) {
        card.should.equal(total);
        done();
      });
    });
  });

  describe('Function: complete', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'state').callsArg(1);
    });

    afterEach(function(){
      queue.state.restore();
    });

    it('should get the completed jobs', function (done) {
      queue.complete(function () {
        queue.state.calledWith('complete').should.be.true;
        done();
      });
    });
  });

  describe('Function: failed', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'state').callsArg(1);
    });

    afterEach(function(){
      queue.state.restore();
    });

    it('should get the completed jobs', function (done) {
      queue.failed(function () {
        queue.state.calledWith('failed').should.be.true;
        done();
      });
    });
  });

  describe('Function: inactive', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'state').callsArg(1);
    });

    afterEach(function(){
      queue.state.restore();
    });

    it('should get the completed jobs', function (done) {
      queue.inactive(function () {
        queue.state.calledWith('inactive').should.be.true;
        done();
      });
    });
  });

  describe('Function: active', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'state').callsArg(1);
    });

    afterEach(function(){
      queue.state.restore();
    });

    it('should get the completed jobs', function (done) {
      queue.active(function () {
        queue.state.calledWith('active').should.be.true;
        done();
      });
    });
  });

  describe('Function: delayed', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'state').callsArg(1);
    });

    afterEach(function(){
      queue.state.restore();
    });

    it('should get the completed jobs', function (done) {
      queue.delayed(function () {
        queue.state.calledWith('delayed').should.be.true;
        done();
      });
    });
  });

  describe('Function: completeCount', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'card').callsArg(1);
      sinon.stub(queue, 'cardByType').callsArg(2);
    });

    afterEach(function(){
      queue.card.restore();
      queue.cardByType.restore();
    });

    it('should get all completed jobs', function (done) {
      queue.completeCount(function () {
        queue.card.calledWith('complete').should.be.true;
        done();
      });
    });

    it('should get all completed jobs of a certain type', function (done) {
      queue.completeCount('type', function () {
        queue.cardByType.calledWith('type', 'complete').should.be.true;
        done();
      });
    });
  });

  describe('Function: failedCount', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'card').callsArg(1);
      sinon.stub(queue, 'cardByType').callsArg(2);
    });

    afterEach(function(){
      queue.card.restore();
      queue.cardByType.restore();
    });

    it('should get all completed jobs', function (done) {
      queue.failedCount(function () {
        queue.card.calledWith('failed').should.be.true;
        done();
      });
    });

    it('should get all completed jobs of a certain type', function (done) {
      queue.failedCount('type', function () {
        queue.cardByType.calledWith('type', 'failed').should.be.true;
        done();
      });
    });
  });

  describe('Function: inactiveCount', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'card').callsArg(1);
      sinon.stub(queue, 'cardByType').callsArg(2);
    });

    afterEach(function(){
      queue.card.restore();
      queue.cardByType.restore();
    });

    it('should get all completed jobs', function (done) {
      queue.inactiveCount(function () {
        queue.card.calledWith('inactive').should.be.true;
        done();
      });
    });

    it('should get all completed jobs of a certain type', function (done) {
      queue.inactiveCount('type', function () {
        queue.cardByType.calledWith('type', 'inactive').should.be.true;
        done();
      });
    });
  });

  describe('Function: activeCount', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'card').callsArg(1);
      sinon.stub(queue, 'cardByType').callsArg(2);
    });

    afterEach(function(){
      queue.card.restore();
      queue.cardByType.restore();
    });

    it('should get all completed jobs', function (done) {
      queue.activeCount(function () {
        queue.card.calledWith('active').should.be.true;
        done();
      });
    });

    it('should get all completed jobs of a certain type', function (done) {
      queue.activeCount('type', function () {
        queue.cardByType.calledWith('type', 'active').should.be.true;
        done();
      });
    });
  });

  describe('Function: delayedCount', function() {
    var queue;

    beforeEach(function(){
      queue = kue.createQueue();
      sinon.stub(queue, 'card').callsArg(1);
      sinon.stub(queue, 'cardByType').callsArg(2);
    });

    afterEach(function(){
      queue.card.restore();
      queue.cardByType.restore();
    });

    it('should get all completed jobs', function (done) {
      queue.delayedCount(function () {
        queue.card.calledWith('delayed').should.be.true;
        done();
      });
    });

    it('should get all completed jobs of a certain type', function (done) {
      queue.delayedCount('type', function () {
        queue.cardByType.calledWith('type', 'delayed').should.be.true;
        done();
      });
    });
  });

});