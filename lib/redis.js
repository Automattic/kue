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
var url = require('url');

/**
 *
 * @param options
 */
exports.configureFactory = function( options, queue ) {
    options.prefix = options.prefix || 'q';

    if (typeof options.redis === 'string') {
        // parse the url
        var conn_info = url.parse(options.redis, true /* parse query string */);
        if (conn_info.protocol !== 'redis:') {
            throw new Error('kue connection string must use the redis: protocol');
        }

        options.redis = {
            port: conn_info.port || 6379,
            host: conn_info.hostname,
            auth: conn_info.auth,
            // see https://github.com/mranney/node_redis#rediscreateclient
            options: conn_info.query
        };
    }

    options.redis = options.redis || {};

    // guarantee that redis._client has not been populated.
    // may warrant some more testing - i was running into cases where shutdown
    // would call redis.reset but an event would be emitted after the reset
    // which would re-create the client and cache it in the redis module.
    exports.reset();

    /**
     * Create a RedisClient.
     *
     * @return {RedisClient}
     * @api private
     */
    exports.createClient = function() {
        var clientFactoryMethod = options.redis.createClientFactory || exports.createClientFactory;
        var client = clientFactoryMethod( options );
        client.on('error', function (err) {
            queue.emit('error', err);
        });
        client.prefix = options.prefix;
        // redefine getKey to use the configured prefix
        client.getKey = function (key) {
            return this.prefix + ':' + key;
        };
        return client;
    };
};

/**
 * Create a RedisClient from options
 *
 * @return {RedisClient}
 * @api private
 */

exports.createClientFactory = function( options ) {
    var socket = options.redis.socket;
    var port = !socket ? (options.redis.port || 6379) : null;
    var host = !socket ? (options.redis.host || '127.0.0.1') : null;
    var client = redis.createClient( socket || port , host, options.redis.options );
    if (options.redis.auth) {
        client.auth(options.redis.auth);
    }
    if (options.redis.db) {
        client.select(options.redis.db);
    }
    return client;
};

//exports.defaultCreateClient = exports.createClient;

/**
 * Create or return the existing RedisClient.
 *
 * @return {RedisClient}
 * @api private
 */

exports.client = function () {
//    if (!exports._client) console.log( "******************** creating _client client... " );
    return exports._client || (exports._client = exports.createClient());
};

/**
 * Return the pubsub-specific redis client.
 *
 * @return {RedisClient}
 * @api private
 */

exports.pubsubClient = function () {
//    if (!exports._pubsub) console.log( "******************** creating _pubsub client... " );
    return exports._pubsub || (exports._pubsub = exports.createClient());
};

/**
 * Resets internal variables to initial state
 *
 * @api private
 */
exports.reset = function () {
    exports._client && exports._client.quit();
    exports._pubsub && exports._pubsub.quit();
    exports._client = null;
    exports._pubsub = null;
};
