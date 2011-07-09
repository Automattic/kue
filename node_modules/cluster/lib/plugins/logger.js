
/*!
 * Cluster - logger
 * Copyright (c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs')
  , Log = require('log');

/**
 * Enable stdout / stderr logs for both the master
 * process, as well as workers.
 *
 * These output to the given `dir`, or `./logs`
 * relative to the server's file.
 *
 * Examples:
 *
 *    // log to ./logs
 *    engine(server)
 *      .use(engine.logger())
 *      .listen(3000);
 *
 *    // log to ./app/logs
 *    engine(server)
 *      .use(engine.logger('./app/logs'))
 *      .listen(3000);
 *
 *    // log to /var/log/node
 *    engine(server)
 *      .use(engine.logger('/var/log/node'))
 *      .listen(3000);
 *
 * @param {String} dir
 * @param {Number} level
 * @return {Function}
 * @api public
 */

module.exports = function(dir, level){
  return function(master){
    dir = master.resolve(dir || 'logs');

    // master log
    var stream = fs.createWriteStream(dir + '/master.log', { flags: 'a' });
    var log = master.log = new Log(level || Log.INFO, stream);

    // master events
    master.on('start', function(){
      log.info('master started');
    });

    // master is shutting down
    master.on('closing', function(){
      log.warning('shutting down master');
    });

    // master has closed and performed cleanup
    master.on('close', function(){
      log.info('shutdown complete');
    });

    // sending signal to all workers
    master.on('kill', function(sig){
      log.warning('sent kill(%s) to all workers', sig);
    });

    // worker was killed
    master.on('worker killed', function(worker){
      if ('restarting' == master.state) return;
      log.error('worker %s died', worker.id);
    });

    // worker exception
    master.on('worker exception', function(worker, err){
      log.error('worker %s uncaught exception %s', worker.id, err.message);
    });
    
    // worker is waiting on connections to be closed
    master.on('worker waiting', function(worker, connections){
      log.info('worker %s waiting on %s connections', worker.id, connections);
    });
    
    // worker has timed out
    master.on('worker timeout', function(worker, timeout){
      log.warning('worker %s timed out after %sms', worker.id, timeout);
    });

    // worker connected to master
    master.on('worker connected', function(worker){
      log.debug('worker %s connected', worker.id);
    });

    // cyclic or immediate restart
    master.on('cyclic restart', function(){
      log.warning('cyclic restart detected, restarting in %sms'
        , master.options['restart timeout']);
    });

    // restart requested
    master.on('restarting', function(){
      log.info('restart requested');
    });
    
    // restart complete
    master.on('restart', function(){
      log.info('restart complete');
    });

    // repl socket connection established
    master.on('repl socket', function(sock){
      var from = sock.remoteAddress
        ? 'from ' + sock.remoteAddress
        : '';
      sock.on('connect', function(){
        log.info('repl connection %s', from);
      });
      sock.on('close', function(){
        log.info('repl disconnect %s', from);
      });
    });

    // override fds
    master.customFds = [-1, -1];

    // children
    master.on('worker', function(worker){
      var proc = worker.proc;

      log.info('spawned worker ' + worker.id);

      // worker log streams
      var access = fs.createWriteStream(dir + '/workers.access.log', { flags: 'a' })
        , error = fs.createWriteStream(dir + '/workers.error.log', { flags: 'a' });

      // redirect stdout / stderr
      // COMPAT:
      if (proc.stdout.pipe) {
        proc.stdout.pipe(access);
        proc.stderr.pipe(error);
      } else {
        proc.stdout.on('data', function(chunk){ access.write(chunk); });
        proc.stderr.on('data', function(chunk){ error.write(chunk); });
      }
    });
  }
};