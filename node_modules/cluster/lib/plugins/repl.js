
/*!
 * Cluster - repl
 * Copyright (c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var net = require('net')
  , repl = require('repl');

/**
 * Enable REPL with all arguments passed to `net.Server#listen()`.
 *
 * Examples:
 *
 *    cluster(server)
 *      .use(cluster.stats())
 *      .use(cluster.repl('/var/run/cluster'))
 *      .listen();
 *
 * In the terminal:
 *
 *    $ sudo telnet /var/run/cluster 
 *
 * @return {Function}
 * @api public
 */

exports = module.exports = function(){
  var args = arguments;
  if (!args.length) throw new Error('repl() plugin requires port/host or path');
  return function(master){
    var server
      , sockets = [];


    // start repl
    function start(){
      // TCP or unix-domain socket repl
      server = net.createServer(function(sock){
        sockets.push(sock);
        var ctx = repl.start('cluster> ', sock).context;
        master.emit('repl socket', sock);

        // augment socket to provide some formatting methods
        sock.title = function(str){ this.write('\n  \033[36m' + str + '\033[0m\n'); }
        sock.row = function(key, val){ this.write('  \033[90m' + key + ':\033[0m ' + val + '\n'); }

        // merge commands into context
        // executing in context of master
        Object.keys(exports).forEach(function(cmd){
          ctx[cmd] = function(){
            var args = Array.prototype.slice.call(arguments);
            args.unshift(master, sock);
            return exports[cmd].apply(master, args);
          };
        });
      });

      // Apply all arguments given
      server.listen.apply(server, args);
    }

    // initial master starts immediately
    // replacements starts when the previous 
    // has closed
    master.on(master.isChild
        ? 'restart'
        : 'start', start);

    // restart notification
    master.on('restarting', function(){
      sockets.forEach(function(sock){
        if (sock.fd) {
          sock.write('\n\033[33mrestarting\033[0m - closing connection soon\n');
        }
      });
    });

    // close
    master.on('close', function(){
      sockets.forEach(function(sock){
        sock.fd && sock.end();
      });
      if (server.fd) server.close();
    });
  }
};

/**
 * Define function `name`, with the given callback
 * `fn(master, sock, ...)` and `description`.
 *
 * @param {String} name
 * @param {Function} fn
 * @param {String} desc
 * @return {Object} exports for chaining
 * @api public
 */

var define = exports.define = function(name, fn, desc){
  (exports[name] = fn).description = desc;
  return exports;
};

/**
 * Display commmand help.
 */

define('help', function(master, sock){
  sock.title('Commands');
  Object.keys(exports).forEach(function(cmd){
    if ('define' == cmd) return;

    var fn = exports[cmd]
      , params = fn.toString().match(/^function +\((.*?)\)/)[1]
      , params = params.split(/ *, */).slice(2);

    sock.row(
      cmd + '(' + params.join(', ') + ')'
      , fn.description);
  });
  sock.write('\n');
}, 'Display help information');

/**
 * Spawn `n` additional workers with the given `signal`.
 */

define('spawn', function(master, sock, n, signal){
  n = n || 1;
  if (n < 0) {
    n = Math.abs(n);
    sock.write('removing ' + n + ' worker' + (n > 1 ? 's' : '')
      + ' with ' + (signal || 'SIGQUIT') + '\n');
    master.remove(n, signal);
  } else {
    sock.write('spawning ' + n + ' worker' + (n > 1 ? 's' : '') + '\n');
    master.spawn(n);
  }
}, 'Spawn one or more additional workers, or remove one or more');

/**
 * Output process ids.
 */

define('pids', function(master, sock){
  sock.title('pids');
  sock.row('master', process.pid);
  master.children.forEach(function(worker){
    sock.row('worker #' + worker.id, worker.proc.pid);
  });
  sock.write('\n');
}, 'Output process ids');

/**
 * Kill the given worker by `id` and `signal`.
 */

define('kill', function(master, sock, id, signal){
  var worker = master.children[id];
  if (worker) {
    worker.proc.kill(signal);
    sock.write('sent \033[36m' + (signal || 'SIGTERM') + '\033[0m to worker #' + id + '\n');
  } else {
    sock.write('invalid worker id\n');
  }
}, 'Send signal or SIGTERM to the given worker');

/**
 * Gracefully shutdown.
 */

define('shutdown', function(master, sock){
  master.close();
}, 'Gracefully shutdown server');

/**
 * Hard shutdown.
 */

define('stop', function(master, sock){
  master.destroy();
}, 'Hard shutdown');

/**
 * Gracefully restart all workers.
 */

define('restart', function(master, sock){
  master.restart();
}, 'Gracefully restart all workers');