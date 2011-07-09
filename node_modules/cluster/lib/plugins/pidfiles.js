
/*!
 * Cluster - pidfiles
 * Copyright (c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs');

/**
 * Save pidfiles to the given `dir` or `./pids`.
 *
 * Examples:
 *
 *    // save to ./pids
 *    cluster(server)
 *      .use(cluster.pidfiles())
 *      .listen(3000);
 *
 *    // save to /tmp
 *    cluster(server)
 *      .use(cluster.pidfiles('/tmp'))
 *      .listen(3000);
 *
 *    // save to /var/run/node
 *    cluster(server)
 *      .use(cluster.logger('/var/run/node'))
 *      .listen(3000);
 *
 * @param {String} dir
 * @return {Function}
 * @api public
 */

module.exports = function(dir){
  return function(master){
    dir = master.pidfiles = master.resolve(dir || 'pids');
    function fn(err){ if (err) throw err; }

    // augment master
    master.pidof = function(name){
      var dir = master.pidfiles
        , path = dir + '/' + name + '.pid'
        , pid = fs.readFileSync(path, 'ascii');
        
      return parseInt(pid, 10);
    };

    master.workerpids = function(){
      var dir = master.pidfiles;
      return fs.readdirSync(dir).filter(function(file){
        return file.match(/^worker\./);
      }).map(function(file){
        return parseInt(fs.readFileSync(dir + '/' + file, 'ascii'), 10);
      });
    };

    // save worker pids
    master.on('worker', function(worker){
      var path = dir + '/worker.' + worker.id + '.pid';
      fs.writeFile(path, worker.proc.pid.toString(), 'ascii', fn);
    });

    master.on('listening', function(){
      // save master pid
      fs.writeFile(dir + '/master.pid', process.pid.toString(), 'ascii', fn);
    });
  }
};