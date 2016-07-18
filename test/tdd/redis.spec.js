var sinon = require('sinon');
var r = require('redis');
var redis = require('../../lib/redis');

describe('redis', function() {

  describe('Function: configureFactory', function() {

    beforeEach(function(){
      sinon.stub(redis, 'reset');
    });

    afterEach(function(){
      redis.reset.restore();
    });

    it('should parse a url connection string', function () {
      var options = {
        redis: 'redis://:password@host:1234/db'
      };
      redis.configureFactory(options);
      options.redis.port.should.equal('1234');
      options.redis.host.should.equal('host');
      options.redis.db.should.equal('db');
    });

    it('should reset everything', function () {
      var options = {
        redis: 'redis://:password@host:1234/db'
      };
      redis.configureFactory(options);
      redis.reset.called.should.be.true;
    });

    it('should export the createClient function', function () {
      var options = {
        redis: 'redis://:password@host:1234/db'
      };
      redis.createClient = null;
      redis.configureFactory(options);
      (typeof redis.createClient == 'function').should.be.true;
    });

  });

  describe('Function: createClient', function() {
    var options;
    beforeEach(function(){
      options = {
        prefix: 'prefix',
        redis: 'redis://:password@host:1234/db'
      };
      redis.configureFactory(options);
      sinon.stub(redis, 'createClientFactory').returns({
        on: sinon.stub()
      });
    });

    afterEach(function(){
      redis.createClientFactory.restore();
    });

    it('should create a client object', function () {
      var client = redis.createClient();
      client.prefix.should.equal(options.prefix);
      ('function' === typeof client.getKey).should.be.true;
      ('function' === typeof client.createFIFO).should.be.true;
      ('function' === typeof client.stripFIFO).should.be.true;
    });

    describe('Function: client.getKey', function() {

      it('should return the key with the prefix', function () {
        var client = redis.createClient();
        var key = client.getKey('key');
        key.should.equal('prefix:key');
      });

      it('should return key with prefix and curly braces for ioredis cluster', function () {
        var client = redis.createClient();
        client.constructor = {
          name: 'Redis'
        };
        var key = client.getKey('key');
        key.should.equal('{prefix}:key');
      });

    });

    describe('Function: client.createFIFO', function() {

      it('should prefix with the length of the id', function () {
        var client = redis.createClient();
        var id = client.createFIFO('12345678910');
        id.should.equal('11|12345678910');
      });

      it('should pad with a zero for single digit length ids', function () {
        var client = redis.createClient();
        var id = client.createFIFO('123');
        id.should.equal('03|123');
      });

    });

    describe('Function: client.stripFIFO', function() {

      it('should strip the prefix on the id', function () {
        var client = redis.createClient();
        var id = client.stripFIFO( '03|123' );
        id.should.equal(123);
      });
    });

  });

  describe('Function: createClientFactory', function() {
    var options, client;
    beforeEach(function(){
      options = {
        prefix: 'prefix',
        redis: {
          port: 'port',
          host: 'host',
          db: 'db',
          options: {}
        }
      };
      client = {
        auth: sinon.stub(),
        select: sinon.stub()
      };
      sinon.stub(r, 'createClient').returns(client);
    });

    afterEach(function(){
      r.createClient.restore();
    });

    it('should create a client', function () {
      var c = redis.createClientFactory(options);
      r.createClient.called.should.be.true;
      r.createClient.calledWith(options.redis.port, options.redis.host, options.redis.options).should.be.true;
    });

    it('should authenticate if auth is present', function () {
      options.redis.auth = 'auth';
      var c = redis.createClientFactory(options);
      client.auth.calledWith(options.redis.auth).should.be.true;
    });

    it('should select the passed in db', function () {
      options.redis.db = 1;
      var c = redis.createClientFactory(options);
      client.select.calledWith(options.redis.db).should.be.true;
    });

  });

  describe('Function: client', function() {

    it('should return the existing client if there is one', function () {
      redis._client = 'client';
      (redis.client()).should.equal('client');
    });

    it('should create a client if one is not present', function () {
      redis._client = null;
      sinon.stub(redis, 'createClient');
      redis.client();
      redis.createClient.called.should.be.true;
      redis.createClient.restore();
    });

  });

  describe('Function: pubsubClient', function() {

    it('should return the existing client if there is one', function () {
      redis._pubsub = 'pubsubClient';
      (redis.pubsubClient()).should.equal('pubsubClient');
    });

    it('should create a pubsubClient if one is not present', function () {
      redis._pubsub = null;
      sinon.stub(redis, 'createClient');
      redis.pubsubClient();
      redis.createClient.called.should.be.true;
      redis.createClient.restore();
    });

  });

  describe('Function: reset', function() {
    var client, pubsub;
    beforeEach(function(){
      client = {
        quit: sinon.stub()
      };
      pubsub = {
        quit: sinon.stub()
      };
      redis._client = client;
      redis._pubsub = pubsub;
    });

    it('should quit and remove the client', function () {
      redis.reset();
      (redis._client == null).should.be.true;
      client.quit.called.should.be.true;
    });

    it('should quick and remove the pubsub client', function () {
      redis.reset();
      (redis._pubsub == null).should.be.true;
      pubsub.quit.called.should.be.true;
    });

  });

});