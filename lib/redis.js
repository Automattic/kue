
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
 * Create a RedisClient
 *
 * @return {RedisClient}
 * @api private
 */

exports.createClient = function() {
  return redis.createClient();
};

