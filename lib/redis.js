
/*!
 * kue - RedisClient factory
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 * Author: bitprobe@gmail.com
 */

/**
 * Module dependencies.
 */
var redis = require('redis');

/**
 * Settings for RedisClient creation
 */

var settings = {};

/**
 * Set option `key` to `val`.
 *
 * @param {String} key
 * @param {Mixed} val
 * @return {Redis} for chaining
 * @api public
 */

exports.set = function(key, val) {
  settings[key] = val;
  return this;
};

/**
 * Create a RedisClient
 *
 * @return {RedisClient}
 * @api private
 */

exports.createClient = function() {
  return redis.createClient(settings.port, settings.host, settings.options);
};

