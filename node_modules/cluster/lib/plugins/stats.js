
/*!
 * Cluster - stats
 * Copyright (c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs')
  , Log = require('log')
  , repl = require('./repl')
  , utils = require('../utils')
  , os;

// COMPAT:
try {
  os = require('os');
} catch (err) {
  // ignore
}

/**
 * Enable stat tracking with the given `options`.
 *
 * Options:
 *
 *  - `connections`    enable connection statistics
 *  - `requests`       enable request statistics
 *  - `lightRequests`  enable light-weight request statistics
 *
 * Real-time applications should utilize `lightRequests` for reporting
 * when possible, although less data is available.
 *
 * TODO: UDP
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

module.exports = function(options){
  options = options || {};
  stats.enableInWorker = options.connections || options.requests;

  function stats(master){
    var server = master.server;
    master.connectionStats = options.connections;
    master.requestStats = options.requests;
    master.lightRequestStats = options.lightRequests;

    // worker stats
    if (master.isWorker) {
      var id = 0;
  
      // connections
      if (options.connections) {
        server.on('connection', function(sock){
          var data = { remoteAddress: sock.remoteAddress };
          master.call('reportStats', 'connection', data);
          sock.on('close', function(){
            master.call('reportStats', 'disconnection', data);
          });
        });
      }

      // light-weight requests
      if (options.lightRequests) {
        utils.unshiftListener(server, 'request', function(req, res){
          master.call('reportStats', 'light request', res.id = ++id);
          var end = res.end;
          res.end = function(str, encoding){
            res.end = end;
            res.end(str, encoding);
            master.call('reportStats', 'light request complete', res.id);
          };
        });
      } 

      // requests
      if (options.requests) {
        utils.unshiftListener(server, 'request', function(req, res){
          var data = {
              remoteAddress: req.socket.remoteAddress
            , headers: req.headers
            , httpVersion: req.httpVersion
            , method: req.method
            , url: req.url
            , id: ++id
          };

          master.call('reportStats', 'request', data);

          var end = res.end;
          res.end = function(str, encoding){
            res.end = end;
            res.end(str, encoding);
            master.call('reportStats', 'request complete', data);
          };
        });
      }
    // master stats
    } else {
      master.stats = {
          start: new Date
        , restarts: 0
        , workersSpawned: 0
        , workersKilled: 0
      };

      // 0.4.x
      if (os) {
        master.stats.totalmem = os.totalmem();
        master.stats.freemem = os.freemem();
      }

      // worker stats
      master.reportStats = function(worker, type, data){
        master.emit('client ' + type, worker, data);
        switch (type) {
          case 'connection':
            worker.stats.connectionsTotal++;
            worker.stats.connectionsActive++;
            break;
          case 'disconnection':
            worker.stats.connectionsActive--;
            break;
          case 'light request':
          case 'request':
            worker.stats.requestsTotal++;
        }
      };

      // total workers spawned
      master.on('worker', function(worker){
        ++master.stats.workersSpawned;
        worker.stats = {
            start: new Date
          , connectionsTotal: 0
          , connectionsActive: 0
          , requestsTotal: 0
        };
      });

      // total worker deaths
      master.on('worker killed', function(worker){
        ++master.stats.workersKilled;
      });

      // restarting
      master.on('restarting', function(data){
        ++master.stats.restarts;
        data.stats = master.stats;
      });

      // restart
      master.on('restart', function(data){
        master.stats = data.stats;
        master.stats.start = new Date(master.stats.start);
      });
    }
  }

  return stats;
};

/**
 * REPL statistics command.
 */

repl.define('stats', function(master, sock){
  var active = master.children.length
    , total = master.stats.workersSpawned
    , deaths = master.stats.workersKilled
    , restarts = master.stats.restarts;

  // master stats
  sock.title('Master');
  if (os) sock.row('os', os.type() + ' ' + os.release());
  sock.row('state', master.state);
  sock.row('started', master.stats.start.toUTCString());
  sock.row('uptime', utils.formatDateRange(new Date, master.stats.start));
  sock.row('restarts', restarts);
  sock.row('workers', active);
  sock.row('deaths', deaths);

  // resources
  if (os) {
    sock.title('Resources');
    sock.row('load average', os.loadavg().map(function(n){ return n.toFixed(2); }).join(' '));
    sock.row('cores utilized', active + ' / ' + os.cpus().length);
    var free = utils.formatBytes(master.stats.freemem);
    var total = utils.formatBytes(master.stats.totalmem);
    sock.row('memory at boot (free / total)', free + ' / ' + total);
    var free = utils.formatBytes(os.freemem());
    var total = utils.formatBytes(os.totalmem());
    sock.row('memory now (free / total)', free + ' / ' + total);
  }

  // worker stats
  sock.title('Workers');

  // connections
  if (master.connectionStats) {
    sock.row('connections total', sum(master.children, 'connectionsTotal'));
    sock.row('connections active', sum(master.children, 'connectionsActive'));
  }

  // requests
  if (master.requestStats) {
    sock.row('requests total', sum(master.children, 'requestsTotal'));
  }

  master.children.forEach(function(worker){
    var stats = ''
      , piped = [];

    // uptime
    stats += utils.formatDateRange(new Date, worker.stats.start);

    // connections
    if (master.connectionStats) {
      piped.push(worker.stats.connectionsActive);
      piped.push(worker.stats.connectionsTotal);
    }

    // requests
    if (master.requestStats) {
      piped.push(worker.stats.requestsTotal);
    }

    if (piped.length) {
      stats += ' ' + piped.join('\033[90m|\033[0m');
    }

    sock.row(worker.id, stats);
  });
  sock.write('\n');
}, 'Display server statistics');


/**
 * Return sum of each `prop` in `arr`.
 *
 * @param {Array} arr
 * @param {String} prop
 * @return {Number}
 * @api private
 */

function sum(arr, prop){
  return arr.reduce(function(sum, obj){
    return sum + obj.stats[prop];
  }, 0);
};
