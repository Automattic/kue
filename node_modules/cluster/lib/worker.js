
/*!
 * Cluster - Worker
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
  , spawn = require('child_process').spawn
  , binding = process.binding('net')
  , utils = require('./utils')
  , net = require('net');

// COMPAT:

net.Socket = net.Stream;

/**
 * Node binary.
 */

var node = process.execPath;

/**
 * Initialize a new `Worker` with the given `master`.
 *
 * Signals:
 *
 *   - `SIGINT`   immediately exit
 *   - `SIGTERM`  immediately exit
 *   - `SIGQUIT`  graceful exit
 *
 * @param {Master} master
 * @api private
 */

var Worker = module.exports = function Worker(master) {
  this.master = master;
  this.server = master.server;
  this.uid = Date.now() + Math.random();
};

/**
 * Inherit from `EventEmitter.prototype`.
 */

Worker.prototype.__proto__ = EventEmitter.prototype;

/**
 * Worker is a receiver.
 */

require('./mixins/receiver')(Worker.prototype);

/**
 * Start worker.
 *
 * @api private
 */

Worker.prototype.start = function(){
  var self = this
    , call = this.master.call;

  // proxy to provide worker id
  this.master.call = function(){
    var args = utils.toArray(arguments);
    args.unshift(self.id);
    return call.apply(this, args);
  };

  // stdin
  this.stdin = new net.Socket(0, 'unix');
  this.stdin.setEncoding('ascii');
  this.stdin.on('data', function(chunk){ self.frame(chunk, self.uid); });
  this.stdin.resume();

  // demote usr/group
  if (this.server) {
    this.server.on('listening', function(){
      var group = self.options.group;
      if (group) process.setgid(group);
      var user = self.options.user;
      if (user) process.setuid(user);
    });

    // stdin
    this.stdin.on('fd', this.server.listenFD.bind(this.server));
  }

  // signal handlers
  process.on('SIGINT', this.destroy.bind(this));
  process.on('SIGTERM', this.destroy.bind(this));
  process.on('SIGQUIT', this.close.bind(this));

  // conditionally handle uncaughtException
  if (!process.listeners('uncaughtException').length) {
    process.on('uncaughtException', function(err){
      // stderr for logs
      console.error(err.stack || err.message);

      // report exception
      self.master.call('workerException', err);

      // exit
      process.nextTick(function(){
        self.destroy();
      });
    });
  }
};

/**
 * Received connect event, set the worker `id`
 * and `options`.
 *
 * @param {String} id
 * @param {Object} options
 * @api private
 */

Worker.prototype.connect = function(id, options){
  this.options = options;

  // worker id
  this.id = id;

  // timeout
  this.timeout = options.timeout;

  // title
  process.title = options['worker title'].replace('{n}', id);

  // notify master of connection
  this.master.call('connect');
};

/**
 * Immediate shutdown.
 *
 * @api private
 */

Worker.prototype.destroy = function(){
  process.exit();
};

/**
 * Perform graceful shutdown.
 *
 * @api private
 */

Worker.prototype.close = function(){
  var self = this
    , server = this.server;

  if (server && server.connections) {
    // stop accepting
    server.watcher.stop();

    // check pending connections
    setInterval(function(){
      self.master.call('workerWaiting', server.connections);
      server.connections || self.destroy();
    }, 2000);

    // timeout
    if (this.timeout) {
      setTimeout(function(){
        self.master.call('workerTimeout', self.timeout);
        self.destroy();
      }, this.timeout);
    }
  } else {
    this.destroy();
  }
};

/**
 * Spawn the worker with the given `id`.
 *
 * @param {Number} id
 * @return {Worker} for chaining
 * @api private
 */

Worker.prototype.spawn = function(id){
  var fds = binding.socketpair()
    , customFds = [fds[0]].concat(this.master.customFds)
    , env = {};

  // merge env
  for (var key in process.env) {
    env[key] = process.env[key];
  }

  this.id = env.CLUSTER_WORKER = id;

  // spawn worker process
  this.proc = spawn(
      node
    , this.master.cmd
    , { customFds: customFds, env: env });

  // unix domain socket for ICP + fd passing
  this.sock = new net.Socket(fds[1], 'unix');

  // saving file descriptors for later use
  this.fds = fds;

  return this;
};

/**
 * Invoke worker's `method` (called from Master).
 *
 * @param {String} method
 * @param {...} args
 * @api private
 */

Worker.prototype.call = function(method){
  this.sock.write(utils.frame({
      args: utils.toArray(arguments, 1)
    , method: method
  }), 'ascii');
};
