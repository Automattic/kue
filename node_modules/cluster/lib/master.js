
/*!
 * Cluster - Master
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Worker = require('./worker')
  , EventEmitter = require('events').EventEmitter
  , binding = process.binding('net')
  , dirname = require('path').dirname
  , spawn = require('child_process').spawn
  , utils = require('./utils')
  , ENOENT = process.version >= 'v0.4.0'
    ? require('constants').ENOENT
    : process.ENOENT
  , net = require('net')
  , fs = require('fs')
  , os;

// COMPAT:

try {
  os = require('os');
} catch (err) {
  // ignore
}

// COMPAT:

net.Socket = net.Stream;

// COMPAT:

if (!net.isIP) net.isIP = binding.isIP;

/**
 * Node binary.
 */

var node = process.execPath;

/**
 * Start a new `Master` with the given `server` or filename to
 * a node module exporting a server.
 *
 * Options:
 *
 *   - `workers`  Number of workers to spawn, defaults to the number of CPUs
 *   - 'working directory`  Working directory defaulting to the script's dir
 *   - 'backlog` Connection backlog, defaulting to 128
 *   - 'socket path` Master socket path defaulting to `./`
 *   - 'timeout` Worker shutdown timeout in milliseconds, defaulting to 60,000
 *   - 'user` User id / name
 *   - 'group` Group id / name
 *   - `title` Master process title, defaults to "cluster master"
 *   - `worker title` Worker process title, defaults to "cluster worker {n}"
 *
 * Events:
 *
 *   - `start`. When the IPC server is prepped
 *   - `worker`. When a worker is spawned, passing the `worker`
 *   - `listening`. When the server is listening for connections  
 *   - `closing`. When master is shutting down
 *   - `close`. When master has completed shutting down
 *   - `worker killed`. When a worker has died
 *   - `worker exception`. Worker uncaughtException. Receives the worker / exception
 *   - `worker removed`. Worker removed via `spawn(-n)`
 *   - `kill`. When a `signal` is being sent to all workers
 *   - `restarting`. Restart requested by REPL or signal. Receives an object
 *      which can be patched in order to preserve plugin state.
 *   - `restart`. Restart complete, new master established, previous died.
 *      Receives an object with state preserved by the `restarting` event.
 *                
 * Signals:
 *
 *   - `SIGINT`   hard shutdown
 *   - `SIGTERM`  hard shutdown
 *   - `SIGQUIT`  graceful shutdown
 *   - `SIGUSR2`  graceful restart
 *
 * @param {net.Server|String} server
 * @return {Master}
 * @api public
 */

var Master = module.exports = function Master(server) {
  var self = this;
  this.server = server;
  this.plugins = [];
  this.children = [];
  this.state = 'active';
  this.startup = new Date;
  this._killed = 0;

  // grab server root
  this.cmd = process.argv.slice(1);
  this.dir = dirname(this.cmd[0]);

  // environment
  this.env = process.env.NODE_ENV || 'development';

  // defaults
  this.options = {
      'backlog': 128
    , 'working directory': this.dir
    , 'socket path': this.dir
    , 'timeout': 60000
    , 'restart threshold': 'development' == this.env ? 5000 : 60000
    , 'restart timeout': 'development' == this.env ? 5000 : 60000
    , 'title': 'cluster'
    , 'worker title': 'cluster worker'
  };

  // parent master pid
  this.ppid = process.env.CLUSTER_PARENT_PID
    ? parseInt(process.env.CLUSTER_PARENT_PID, 10)
    : null;

  // process is a worker
  this.isWorker = !! process.env.CLUSTER_MASTER_PID;

  // process is a child (worker or master replacement)
  this.isChild = this.isWorker || !! process.env.CLUSTER_REPLACEMENT_MASTER;

  // process is master
  this.isMaster = ! this.isWorker;

  // process id
  this.pid = process.pid;
  if (this.isMaster) process.env.CLUSTER_MASTER_PID = this.pid;

  // custom worker fds, defaults to std{out,err}
  this.customFds = [1, 2];

  // tcp server for IPC
  this._server = net.createServer(function(sock){
    sock.setEncoding('ascii');
    sock.on('data', function(chunk){
      self.frame(chunk, sock.fd);
    });
  });

  // resolve server filename
  if (this.isWorker && 'string' == typeof this.server) {
    this.server = require(this.resolve(this.server));
  }

  // IPC is prepped
  this.on('start', function(){
    process.chdir(self.options['working directory']);
  });

  // spawn our workers
  this.on('listening', function(){
    self.spawn(self.options.workers);
  });
};

/**
 * Interit from `EventEmitter.prototype`.
 */

Master.prototype.__proto__ = EventEmitter.prototype;

/**
 * Worker is a receiver.
 */

require('./mixins/receiver')(Master.prototype);

/**
 * Resolve `path` relative to the server file being executed.
 *
 * @param {String} path
 * @return {String}
 * @api public
 */

Master.prototype.resolve = function(path){
  return '/' == path[0]
    ? path
    : this.dir + '/' + path;
};

/**
 * Return the path of the unix domain socket used for IPC.
 *
 * @return {String}
 * @api public
 */

Master.prototype.__defineGetter__('socketPath', function(){
  var pid = process.env.CLUSTER_MASTER_PID || this.pid;
  return this.options['socket path'] + '/cluster.' + pid + '.sock';
});

/**
 * Return `true` when the environment set by `Master#in()`
 * matches __NODE_ENV__.
 *
 * @return {Boolean}
 * @api private
 */

Master.prototype.__defineGetter__('environmentMatches', function(){
  if (this._env) 
    return this.env == this._env || 'all' == this._env;
  return true;
});

/**
 * Invoke masters's `method` with worker `id`. (called from Worker)
 *
 * @param {Number} id
 * @param {String} method
 * @param {...} args
 * @api private
 */

Master.prototype.call = function(id, method){
  this.sock.write(utils.frame({
      args: utils.toArray(arguments, 2)
    , method: method
    , id: id
  }), 'ascii');
};

/**
 * Perform setup tasks then invoke `fn()` when present.
 *
 * @param {Function} fn
 * @return {Master} for chaining
 * @api public
 */

Master.prototype.start = function(fn){
  var self = this;

  // deferred title
  process.title = this.options.title;

  // prevent listen
  if (this.preventDefault) return;

  // env match
  if (this.environmentMatches) {
    // worker process
    if (this.isWorker) {
      // connect the worker
      var worker = new Worker(this);
      this.sock = net.createConnection(this.socketPath);
      this.sock.on('connect', function(){
        worker.start();
      });
    // master process
    } else if (fn) {
      fn();
    // standalone
    } else {
      this.setupIPC();
      this.on('start', function(){
        self.emit('listening');
      });
    }
  }

  return this;
};

/**
 * Defer `http.Server#listen()` call.
 *
 * @param {Number|String} port or unix domain socket path
 * @param {String|Function} host or callback
 * @param {Function} callback
 * @return {Master} for chaining
 * @api public
 */

Master.prototype.listen = function(port, host, callback){
  var self = this;
  if (!this.environmentMatches) return this;
  if ('function' == typeof host) callback = host, host = null;
  this.port = port;
  this.host = host;
  this.callback = callback;
  return this.start(function(){
    self.on('start', function(){
      self.startListening(!self.isChild);
    });

    if (self.isChild) {
      self.acceptFd();
    } else {
      self.createSocket(function(err, fd){
        if (err) throw err;
        self.fd = fd;
        self.setupIPC();
      });
    }
  });
};

/**
 * Setup IPC.
 *
 * @api private
 */

Master.prototype.setupIPC = function(){
  var self = this;

  // signal handlers
  this.registerSignalHandlers();

  // Default worker to the # of cpus
  this.defaultWorkers();

  // TCP server for IPC
  this._server.listen(this.socketPath, function(){
    self.emit('start');
  });
};

/**
 * Conditionally perform the following action, if 
 * __NODE_ENV__ matches `env`.
 *
 * Examples:
 *
 *      cluster(server)
 *        .in('development').use(cluster.debug())
 *        .in('development').listen(3000)
 *        .in('production').listen(80);
 *     
 * @param {String} env
 * @return {Master} self or stubs
 * @api public
 */

Master.prototype.in = function(env){
  this._env = env;
  return this;
};

/**
 * Set option `key` to `val`.
 *
 * @param {String} key
 * @param {Mixed} val
 * @return {Master} for chaining
 * @api public
 */

Master.prototype.set = function(key, val){
  if (this.environmentMatches) this.options[key] = val;
  return this;
};

/**
 * Invoke `fn(master)`.
 *
 * @param {Function} fn
 * @api public
 */

Master.prototype.do = function(fn){
  if (this.environmentMatches) fn.call(this, this);
  return this;
};

/**
 * Check if `option` has been set.
 *
 * @param {String} option
 * @return {Boolean}
 * @api public
 */

Master.prototype.has = function(option){
  return !! this.options[option];
};

/**
 * Use the given `plugin`.
 *
 * @param {Function} plugin
 * @return {Master} for chaining
 * @api public
 */

Master.prototype.use = function(plugin){
  if (this.environmentMatches) {
    this.plugins.push(plugin);
    if (this.isWorker) {
      plugin.enableInWorker && plugin(this);
    } else {
      plugin(this);
    }
  }
  return this;
};

/**
 * Create listening socket and callback `fn(err, fd)`.
 *
 * @return {Function} fn
 * @api private
 */

Master.prototype.createSocket = function(fn){
  var self = this
    , ipv;

  // explicit host
  if (this.host) {
    // ip
    if (ipv = net.isIP(this.host)) {
      fn(null, binding.socket('tcp' + ipv));
    // lookup
    } else {
      require('dns').lookup(this.host, function(err, ip, ipv){
        if (err) return fn(err);
        self.host = ip;
        fn(null, binding.socket('tcp' + ipv));
      });
    }
  // local socket
  } else if ('string' == typeof this.port) {
    fn(null, binding.socket('unix'));
  // only port
  } else if (this.port) {
    fn(null, binding.socket('tcp4'));
  }
};

/**
 * Register signal handlers.
 *
 * @api private
 */

Master.prototype.registerSignalHandlers = function(){
  process.on('SIGINT', this.destroy.bind(this));
  process.on('SIGTERM', this.destroy.bind(this));
  process.on('SIGQUIT', this.close.bind(this));
  process.on('SIGUSR2', this.attemptRestart.bind(this));
  process.on('SIGCHLD', this.maintainWorkerCount.bind(this));
};

/**
 * Default workers to the number of cpus available.
 *
 * @api private
 */

Master.prototype.defaultWorkers = function(){
  if (!this.has('workers')) {
    this.set('workers', os
      ? os.cpus().length
      : 1);
  }
};

/**
 * Maintain worker count, re-spawning if necessary.
 *
 * @api private
 */

Master.prototype.maintainWorkerCount = function(){
  this.children.forEach(function(worker){
    var pid = worker.proc.pid;
    if (!pid) this.workerKilled(worker);
  }, this);
};

/**
 * Remove `n` workers with `signal`
 * defaulting to __SIGQUIT__.
 *
 * @param {Number} n
 * @param {String} signal
 * @api public
 */

Master.prototype.remove = function(n, signal){
  if (!arguments.length) n = 1;
  var len = this.children.length
    , worker;

  // cap at worker len
  if (n > len) n = len;

  // remove the workers
  while (n--) {
    worker = this.children.pop();
    worker.proc.kill(signal || 'SIGQUIT');
    this.emit('worker removed', worker);
    this.removeWorker(worker.id);
  }
};

/**
 * Remove worker `id`.
 *
 * @param {Number} id
 * @api public
 */

Master.prototype.removeWorker = function(id){
  var worker = this.children[id];
  if (!worker) return;
  if (worker.fds) {
    binding.close(worker.fds[0]);
    binding.close(worker.fds[1]);
  }
  delete this.children[id];
};

/**
 * Spawn `n` workers.
 *
 * @param {Number} n
 * @api public
 */

Master.prototype.spawn = function(n){
  if (!arguments.length) n = 1;
  while (n--) this.spawnWorker();
};

/**
 * Spawn a worker with optional `id`.
 *
 * @param {Number} id
 * @return {Worker}
 * @api private
 */

Master.prototype.spawnWorker = function(id){
  var worker;

  // id given
  if ('number' == typeof id) {
    worker = new Worker(this).spawn(id)
    this.children[id] = worker;
    worker.id = id;
  // generate an id
  } else {
    worker = new Worker(this).spawn(this.children.length);
    this.children.push(worker);
  }

  var obj = {
      method: 'connect'
    , args: [worker.id, this.options]
  };

  worker.sock.write(utils.frame(obj), 'ascii', this.fd);

  // emit
  this.emit('worker', worker);

  return worker;
};

/**
 * Graceful shutdown, wait for all workers
 * to reply before exiting.
 *
 * @api public
 */

Master.prototype.close = function(){
  this.state = 'graceful shutdown';
  this.emit('closing');
  this.kill('SIGQUIT');
  this.pendingDeaths = this.children.length;
};

/**
 * Hard shutdwn, immediately kill all workers.
 *
 * @api public
 */

Master.prototype.destroy = function(){
  this.state = 'hard shutdown';
  this.emit('closing');
  this.kill('SIGKILL');
  this._destroy();
};

/**
 * Attempt restart, while respecting the `restart threshold`
 * setting, to help prevent recursive restarts.
 *
 * @param {String} sig
 * @api private
 */

Master.prototype.attemptRestart = function(sig){
  var uptime = new Date - this.startup
    , threshold = this.options['restart threshold']
    , timeout = this.options['restart timeout'];

  if (this.__restarting) return;

  if (uptime < threshold) {
    this.__restarting = true;
    this.emit('cyclic restart');
    setTimeout(function(self){
      self.restart(sig);
    }, timeout, this);
  } else {
    this.restart(sig);
  }
};

/**
 * Restart all workers, by sending __SIGQUIT__
 * or `sig` to them, enabling master to re-spawn.
 *
 * @param {String} sig
 * @return {ChildProcess} replacement master process
 * @api public
 */

Master.prototype.restart = function(sig){
  var data = {}
    , proc = this.spawnMaster();

  // pass object to plugins, allowing them
  // to patch it, and utilize the data in
  // the new Master
  this.emit('restarting', data);
  proc.sock.write(utils.frame({
      method: 'connectMaster'
    , args: [sig || 'SIGQUIT']
  }), 'ascii', this.fd);

  this.on('close', function(){
    proc.sock.write(utils.frame({
        method: 'masterKilled'
      , args: [data]
    }), 'ascii');
  });

  return proc;
};

/**
 * Spawn a new master process.
 *
 * @return {ChildProcess}
 * @api private
 */

Master.prototype.spawnMaster = function(){
  var fds = binding.socketpair()
    , customFds = [fds[0], 1, 2]
    , env = {};

  // merge current env
  for (var key in process.env) {
    env[key] = process.env[key];
  }

  delete env.CLUSTER_MASTER_PID;
  env.CLUSTER_REPLACEMENT_MASTER = 1;
  env.CLUSTER_PARENT_PID = this.pid;

  // spawn new master process
  var proc = spawn(node, this.cmd, {
      customFds: customFds
    , env: env
  });
  
  proc.stdin = new net.Socket(fds[0]);

  // unix domain socket for ICP + fd passing
  proc.sock = new net.Socket(fds[1], 'unix');;
  return proc;
};

/**
 * Master replacement connected.
 *
 * @param {String} sig
 * @api private
 */

Master.prototype.connectMaster = function(sig){
  var self = this;
  this.on('listening', function(){
    process.kill(self.ppid, sig);
  });
};

/**
 * Original master has died aka 'retired',
 * we now fire the 'restart' event.
 *
 * @param {Object} data
 * @api private
 */

Master.prototype.masterKilled = function(data){
  this.emit('restart', data);
};

/**
 * Accept fd from parent master, then `setupIPC()`.
 *
 * @api private
 */

Master.prototype.acceptFd = function(){
  var self = this
    , stdin = new net.Socket(0, 'unix');

  // set fd and start master
  stdin.setEncoding('ascii');
  stdin.on('fd', function(fd){
    self.fd = fd;
    self.setupIPC();
  });

  // frame commands from the parent master
  stdin.on('data', this.frame.bind(this));
  stdin.resume();
};

/**
 * Close servers and emit 'close' before exiting.
 *
 * @api private
 */

Master.prototype._destroy = function(){
  var self = this;
  self._server.on('close', function(){
    if (self.fd) binding.close(self.fd);
    self.emit('close');
    process.nextTick(process.exit.bind(process));
  }).close();
};

/**
 * Worker is connected.
 *
 * @param {Worker} worker
 * @api private
 */

Master.prototype.connect = function(worker){
  this.emit('worker connected', worker);
};

/**
 * Start listening, when `bind` is `true` the socket
 * will be bound, and will start listening for connections.
 *
 * @param {Boolean} bind
 * @api private
 */

Master.prototype.startListening = function(bind){
  var self = this;

  // remove unix domain socket 
  if ('string' == typeof this.port && bind) {
    fs.unlink(this.port, function(err){
      if (ENOENT != err.errno) throw err;
      listen();
    });
  } else {
    listen();
  }

  // bind / listen
  function listen() {
    if (bind) {
      try {
        binding.bind(self.fd, self.port, self.host);
        binding.listen(self.fd, self.options.backlog);
      } catch(e) {
        self.kill('SIGKILL');
        throw e;
      }
    }
    self.callback && self.callback();
    self.emit('listening');
  }
};

/**
 * The given `worker` has been killed.
 * Emit the "worker killed" event, remove
 * the worker, and re-spawn depending on 
 * the master state.
 *
 * @api private
 */

Master.prototype.workerKilled = function(worker){
  // if we have many failing workers at boot
  // then we likely have a serious issue.
  if (new Date - this.startup < 20000) {
    if (++this._killed == 20) {
      console.error('');
      console.error('Cluster detected over 20 worker deaths in the first');
      console.error('20 seconds of life, there is most likely');
      console.error('a serious issue with your server.');
      console.error('');
      console.error('aborting.');
      console.error('');
      process.exit(1);
    }
  }

  // emit event
  this.emit('worker killed', worker);

  // always remove worker
  this.removeWorker(worker.id);

  // state specifics
  switch (this.state) {
    case 'hard shutdown':
      break;
    case 'graceful shutdown':
      --this.pendingDeaths || this._destroy();
      break;
    default:
      this.spawnWorker(worker.id);
  }
};

/**
 * `worker` received exception `err`.
 *
 * @api private
 */

Master.prototype.workerException = function(worker, err){
  this.emit('worker exception', worker, err);
};

/**
 * Received worker timeout.
 * 
 * @api private
 */

Master.prototype.workerTimeout = function(worker, timeout){
  this.emit('worker timeout', worker, timeout);
};

/**
 * Worker waiting on `connections` to close.
 * 
 * @api private
 */

Master.prototype.workerWaiting = function(worker, connections){
  this.emit('worker waiting', worker, connections);
};

/**
 * Send `sig` to all worker processes, defaults to __SIGTERM__.
 *
 * @param {String} sig
 * @api public
 */

Master.prototype.kill = function(sig){
  var self = this;
  this.emit('kill', sig);
  this.children.forEach(function(worker){
    worker.proc.kill(sig);
  });
};
