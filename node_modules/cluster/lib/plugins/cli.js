
/*!
 * Cluster - cli
 * Copyright (c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs')
  , Log = require('log')
  , ESRCH = process.version >= 'v0.4.0'
    ? require('constants').ESRCH
    : process.ESRCH

/**
 * Commands.
 */

var commands = [];

/**
 * Adds a command-line interface to your cluster.
 *
 * This plugin requires that you use `pidfiles()`
 * above `cli()`, so that the pidfile directory
 * is exposed.
 *
 * Examples:
 *
 *     cluster(server)
 *       .use(cluster.pidfiles())
 *       .use(cluster.cli())
 *       .listen(3000);
 *
 * Once set up our server script serves as both
 * the master, and the CLI. For example we may
 * still launch the server(s) as shown below.
 *
 *      $ nohup node server.js &
 *
 * However now we may also utilize commands
 * provided by this plugin.
 *
 *     $ node server.js status
 *
 *       master 3281 dead
 *       worker 0 3282 dead
 *
 * For more command information use `--help`.
 *
 *     $ node server.js --help
 *
 * @return {Function}
 * @api public
 */

exports = module.exports = function(){
  return function(master){
    requirePIDs(master);

    // augment master
    master.killall = function(sig){
      var pid = master.pidof('master');
      try {
        // signal master
        process.kill(pid, sig);
      } catch (err) {
        if (ESRCH != err.errno) throw err;
        // signal children individually
        master.workerpids().forEach(function(pid){
          try {
            process.kill(pid, sig);
          } catch (err) {
            if (ESRCH != err.errno) throw err;
          }
        });
      }
    };

    var args = process.argv.slice(2)
      , len = commands.length
      , command
      , arg;

    // parse arguments
    while (args.length) {
      arg = args.shift();
      for (var i = 0; i < len; ++i) {
        command = commands[i];
        if (~command.flags.indexOf(arg)) {
          command.callback(master);
          process.exit(0);
        }
      }
    }
  }
};

/**
 * Define command `name` with the given callback `fn(master)`
 * and a short `desc`.
 *
 * @param {String} name
 * @param {Function} fn
 * @param {String} desc
 * @return {Object} exports for chaining
 * @api public
 */

var define = exports.define = function(name, fn, desc){
  commands.push({
      flags: name.split(/ *, */)
    , desc: desc
    , callback: fn
  });
  return exports;
};

/**
 * Report master / worker status based on
 * the PID files saved by the pidfiles()
 * plugin.
 */

define('-s, --status, status', function(master){
  var dir = master.pidfiles
    , files = fs.readdirSync(dir);

  // null signal failed previous
  // to this release
  if (process.version < 'v0.4.1') {
    console.log('status will not work with node < 0.4.1');
    console.log('due to SIGTERM globbering the null signal');
    process.exit(1);
  }

  console.log();

  // only pids
  files.filter(function(file){
    return file.match(/\.pid$/);
  // check status
  }).forEach(function(file){
    var name = file.replace('.pid', '')
      , pid = master.pidof(name)
      , name = name.replace('.', ' ')
      , color
      , status;

    try {
      process.kill(pid, 0);
      status = 'alive';
      color = '36';
    } catch (err) {
      if (ESRCH == err.errno) {
        color = '31';
        status = 'dead';
      } else {
        throw err;
      }
    }

    console.log('  %s\033[90m %d\033[0m \033[' + color + 'm%s\033[0m'
      , name
      , pid
      , status);
  });

  console.log();
}, 'Output cluster status');

/**
 * Restart workers.
 */

define('-r, --restart, restart', function(master){
  master.killall('SIGUSR2');
}, 'Restart master by sending the SIGUSR2 signal');

/**
 * Graceful shutdown.
 */

define('-g, --shutdown, shutdown', function(master){
  master.killall('SIGQUIT');
}, 'Graceful shutdown by sending the SIGQUIT signal');

/**
 * Hard shutdown.
 */

define('-S, --stop, stop', function(master){
  master.killall('SIGTERM');
}, 'Hard shutdown by sending the SIGTERM signal');

/**
 * Display help information.
 */

define('-h, --help, help', function(master){
  console.log('\n  Usage: node <file> <command>\n');
  commands.forEach(function(command){
    console.log('    '
      + command.flags.join(', ')
      + '\n    '
      + '\033[90m' + command.desc + '\033[0m'
      + '\n');
  });
  console.log();
}, 'Show help information');

/**
 * Output cluster version.
 */

define('-v, --version', function(master){
  console.log(require('../cluster').version);
}, 'Output cluster version');

/**
 * Require `pidfiles()` plugin.
 *
 * @param {Master} master
 * @api private
 */

function requirePIDs(master) {
  if (master.pidfiles) return;
  throw new Error('cli() plugin requires pidfiles(), please add pidfiles() before cli()');
}