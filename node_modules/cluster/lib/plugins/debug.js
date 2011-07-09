
/*!
 * Cluster - debug
 * Copyright (c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Enable verbose debugging output.
 *
 * @return {Function}
 * @api public
 */

module.exports = function(options){
  options = options || {};

  // strip colors

  function color(text) {
    if (options.colors === false) return text.replace(/\033\[\d+m/g, '');
    return text
  }

  // logger

  var log = {
    debug: function(str){
      console.error(color('  \033[90mdebug - %s\033[0m'), str);
    },
    info: function(str){
      console.error(color('  info \033[90m- %s\033[0m'), str);
    },
    warning: function(str){
      console.error(color('  \033[33mwarning\033[0m \033[90m- %s\033[0m'), str);
    },
    error: function(str){
      console.error(color('  \033[31merror\033[0m \033[90m- %s\033[0m'), str);
    }
  };

  return function(master){

    // start
    master.on('start', function(){
      log.info('master started');
    });

    // closing
    master.on('closing', function(){
      log.info('shutting down');
    });

    // close
    master.on('close', function(){
      log.info('shutdown complete');
    });

    // killing workers
    master.on('kill', function(sig){
      log.warning('kill(' + (sig || 'SIGTERM') + ')');
    });

    // worker died
    master.on('worker killed', function(worker){
      if ('restarting' == master.state) return;
      log.warning('worker ' + worker.id + ' died');
    });

    // worker exception
    master.on('worker exception', function(worker, err){
      log.error('worker ' + worker.id + ' uncaught exception ' + err.message);
    });

    // worker is waiting on connections to be closed
    master.on('worker waiting', function(worker, connections){
      log.warning('worker ' + worker.id + ' waiting on ' + connections + ' connections');
    });

    // worker has timed out
    master.on('worker timeout', function(worker, timeout){
      log.warning('worker ' + worker.id + ' timed out after ' + timeout + 'ms');
    });

    // connection
    master.on('worker connected', function(worker){
      log.info('worker ' + worker.id + ' connected');
    });
    
    // removed
    master.on('worker removed', function(worker){
      log.info('worker ' + worker.id + ' removed');
    });

    // worker
    master.on('worker', function(worker){
      log.info('worker ' + worker.id + ' spawned');
    });

    // listening
    master.on('listening', function(){
      log.info('listening for connections');
    });

    // cyclic or immediate restart
    master.on('cyclic restart', function(){
      log.warning('cyclic restart detected, restarting in ' + master.options['restart timeout'] + 'ms');
    });

    // restart requested
    master.on('restarting', function(){
      log.info('restart requested');
    });

    // restart complete
    master.on('restart', function(){
      log.info('restart complete');
    });

    // exit
    process.on('exit', function(){
      log.debug('exit');
    });
  }
};