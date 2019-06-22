/*!
 * kue
 * Copyright (c) 2013 Automattic <behradz@gmail.com>
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Queue       = require('./queue')

/**
 * Expose `Queue`.
 */

exports = module.exports = Queue;

/**
 * Library version.
 */

exports.version = require('../package.json').version;

/**
 * Create a new `Queue`.
 *
 * @return {Queue}
 * @api public
 */

exports.createQueue = function( options ) {
  var queue = new Queue(options);
  queue.events.subscribe();
  return queue;

};

/**
 * Get `Queue` singleton.
 *
 * @return {Queue}
 * @api public
 */

exports.getQueue = function( options ) {
  if(!Queue.singleton){
    Queue.singleton = new Queue(options);
  }
  Queue.singleton.events.subscribe();
  return Queue.singleton;

};

/**
 * Shutdown the singleton `Queue`.
 *
 * @api public
 */

exports.shutdown = function( ) {
  var singleton = this.getQueue()
  return singleton.shutdown.apply(singleton, arguments)
};
