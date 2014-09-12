/*!
 * kue - Job
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var EventEmitter = require('events').EventEmitter
    , events = require('./events')
    , redis = require('../redis')
    , reds = require('reds')
    , _ = require('lodash')
    , noop = function () {
    };

_.mixin(require("lodash-deep"));

/**
 * Expose `Job`.
 */

exports = module.exports = Job;


exports.disableSearch = false;

/**
 * Search instance.
 */
var search;
function getSearch() {
    if (search) return search;
    reds.createClient = require('../redis').createClient;
    return search = reds.createSearch(redis.client().getKey('search'));
}

/**
 * Default job priority map.
 */

var priorities = exports.priorities = {
    low: 10, normal: 0, medium: -5, high: -10, critical: -15
};

/**
 * Map `jobs` by the given array of `ids`.
 *
 * @param {Object} jobs
 * @param {Array} ids
 * @return {Array}
 * @api private
 */

function map(jobs, ids) {
    var ret = [];
    ids.forEach(function (id) {
        if (jobs[id]) ret.push(jobs[id]);
    });
    ret = ret.sort(function (a, b) {
        return parseInt(a.id) - parseInt(b.id);
    });
    return ret;
}

/**
 * Return a function that handles fetching
 * of jobs by the ids fetched.
 *
 * @param {Function} fn
 * @param {String} order
 * @return {Function}
 * @api private
 */

function get(fn, order) {
    return function (err, ids) {
        if (err) return fn(err);
        var pending = ids.length
            , jobs = {};
        if (!pending) return fn(null, ids);
        ids.forEach(function (id) {
            exports.get(id, function (err, job) {
                if (err) {
//                    events.emit(id, 'error', err);
                    console.error(err);
                } else {
                    jobs[job.id] = job;
                }
                --pending || fn(null, 'desc' == order
                    ? map(jobs, ids).reverse()
                    : map(jobs, ids));

            });
        });
    }
}

/**
 * Get with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */

exports.range = function (from, to, order, fn) {
    redis.client().zrange(redis.client().getKey('jobs'), from, to, get(fn, order));
};

/**
 * Get jobs of `state`, with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {String} state
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */

exports.rangeByState = function (state, from, to, order, fn) {
    redis.client().zrange(redis.client().getKey('jobs:' + state), from, to, get(fn, order));
};

/**
 * Get jobs of `type` and `state`, with the range `from`..`to`
 * and invoke callback `fn(err, ids)`.
 *
 * @param {String} type
 * @param {String} state
 * @param {Number} from
 * @param {Number} to
 * @param {String} order
 * @param {Function} fn
 * @api public
 */

exports.rangeByType = function (type, state, from, to, order, fn) {
    redis.client().zrange(redis.client().getKey('jobs:' + type + ':' + state), from, to, get(fn, order));
};

/**
 * Get job with `id` and callback `fn(err, job)`.
 *
 * @param {Number} id
 * @param {Function} fn
 * @api public
 */

exports.get = function (id, fn) {
  var client = redis.client()
        , job = new Job;

    job.id = id;
    client.hgetall(client.getKey('job:' + job.id), function (err, hash) {
        if (err) return fn(err);
        if (!hash) { exports.removeBadJob(job.id); return fn(new Error('job "' + job.id + '" doesnt exist')); }
        if (!hash.type) { exports.removeBadJob(job.id,hash); return fn(new Error('job "' + job.id + '" is invalid')) }
        // TODO: really lame, change some methods so
        // we can just merge these
        job.type = hash.type;
        job._delay = hash.delay;
        job.priority(Number(hash.priority));
        job._progress = hash.progress;
        job._attempts = hash.attempts;
        job._max_attempts = hash.max_attempts;
        job._state = hash.state;
        job._error = hash.error;
        job.created_at = hash.created_at;
        job.updated_at = hash.updated_at;
        job.failed_at = hash.failed_at;
        job.duration = hash.duration;
        job._removeOnComplete = hash.removeOnComplete;
        try {
            if (hash.data) job.data = JSON.parse(hash.data);
            if (hash.result) job.result = JSON.parse(hash.result);
            if (hash.backoff) {
                var source = 'job._backoff = ' + hash.backoff + ";";
//                require('vm').runInContext( source );
                eval( source );
            }
        } catch (e) {
            err = e;
        }
        fn(err, job);
    });
};

exports.removeBadJob = function (id, hash) {
    var client = redis.client();
    if( hash && hash.state ) {
        client.zrem(client.getKey('jobs:' + hash.state), id);
    }
    client.multi()
        .del(client.getKey('job:' + id + ':log'))
        .del(client.getKey('job:' + id))
        .zrem(client.getKey('jobs'), id)
    .exec();
    if( !exports.disableSearch ){
        getSearch().remove(id);
    }
};

/**
 * Remove job `id` if it exists and invoke callback `fn(err)`.
 *
 * @param {Number} id
 * @param {Function} fn
 * @api public
 */

exports.remove = function (id, fn) {
    fn = fn || noop;
    exports.get(id, function (err, job) {
        if (err) return fn(err);
        if (!job) return fn(new Error('failed to find job ' + id));
        job.remove(fn);
    });
};

/**
 * Get log for job `id` and callback `fn(err, log)`.
 *
 * @param {Number} id
 * @param {Function} fn
 * @return {Type}
 * @api public
 */

exports.log = function (id, fn) {
    /*redis*/Job.client/*()*/.lrange(Job.client.getKey('job:' + id + ':log'), 0, -1, fn);
};

/**
 * Initialize a new `Job` with the given `type` and `data`.
 *
 * @param {String} type
 * @param {Object} data
 * @api public
 */

function Job(type, data) {
    this.type = type;
    this.data = data || {};
    this._max_attempts = 1;
//  this.client = redis.client();
    this.client = Job.client/* || (Job.client = redis.client())*/;
    this.priority('normal');
    this.on("error", function(err){});// prevent uncaught exceptions on failed job errors
}

/**
 * Inherit from `EventEmitter.prototype`.
 */

Job.prototype.__proto__ = EventEmitter.prototype;

/**
 * Return JSON-friendly object.
 *
 * @return {Object}
 * @api public
 */

Job.prototype.toJSON = function () {
    return {
          id: this.id
        , type: this.type
        , data: this.data
        , result: this.result
        , priority: this._priority
        , progress: this._progress || 0
        , state: this._state
        , error: this._error
        , created_at: this.created_at
        , updated_at: this.updated_at
        , failed_at: this.failed_at
        , duration: this.duration
        , delay: this._delay
        , attempts: {
            made: Number(this._attempts) || 0
          , remaining: this._attempts ? this._max_attempts - this._attempts : Number(this._max_attempts)||1
          , max: Number( this._max_attempts ) || 1
        }
    };
};

/**
 * Log `str` with sprintf-style variable args.
 *
 * Examples:
 *
 *    job.log('preparing attachments');
 *    job.log('sending email to %s at %s', user.name, user.email);
 *
 * Specifiers:
 *
 *   - %s : string
 *   - %d : integer
 *
 * @param {String} str
 * @param {Mixed} ...
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.log = function (str) {
    var args = arguments
        , i = 1;

    str = str.replace(/%([sd])/g, function (_, type) {
        var arg = args[i++];
        switch (type) {
            case 'd':
                return arg | 0;
            case 's':
                return arg;
        }
    });

    this.client.rpush(this.client.getKey('job:' + this.id + ':log'), str);
    this.set('updated_at', Date.now());
    return this;
};

/**
 * Set job `key` to `val`.
 *
 * @param {String} key
 * @param {String} val
 * @param {String} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.set = function (key, val, fn) {
    this.client.hset(this.client.getKey('job:' + this.id), key, val, fn || noop);
    return this;
};

/**
 * Get job `key`
 *
 * @param {String} key
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.get = function (key, fn) {
    this.client.hget(this.client.getKey('job:' + this.id), key, fn || noop);
    return this;
};

/**
 * Set the job progress by telling the job
 * how `complete` it is relative to `total`.
 *
 * @param {Number} complete
 * @param {Number} total
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.progress = function (complete, total) {
    if (0 == arguments.length) return this._progress;
    var n = Math.min(100, complete / total * 100 | 0);
    this.set('progress', n);
    this.set('updated_at', Date.now());
    events.emit(this.id, 'progress', n);
    return this;
};

/**
 * Set the job delay in `ms`.
 *
 * @param {Number} ms
 * @return {Job|Number}
 * @api public
 */

Job.prototype.delay = function (ms) {
    if (0 == arguments.length) return this._delay;
    this._delay = ms;
//    this._state = 'delayed';
    return this;
};

Job.prototype.removeOnComplete = function (param) {
    if (0 == arguments.length) return this._removeOnComplete;
    this._removeOnComplete = param;
    return this;
};

Job.prototype.backoff = function (param) {
    if (0 == arguments.length) return this._backoff;
    this._backoff = param;
    return this;
};

Job.prototype._getBackoffImpl = function() {
    var supported_backoffs = {
        fixed: function(delay){
            return function( attempts ){
                return delay;
            };
        }
        ,exponential: function(delay){
            return function( attempts ) {
                return Math.round( delay * 0.5 * ( Math.pow(2, attempts) - 1) );
            };
        }
    };
    if( _.isPlainObject( this._backoff ) ) {
        return supported_backoffs[ this._backoff.type ]( this._backoff.delay || this._delay );
    } else {
        return this._backoff;
    }
};

/**
 * Set or get the priority `level`, which is one
 * of "low", "normal", "medium", and "high", or
 * a number in the range of -10..10.
 *
 * @param {String|Number} level
 * @return {Job|Number} for chaining
 * @api public
 */

Job.prototype.priority = function (level) {
    if (0 == arguments.length) return this._priority;
    this._priority = null == priorities[level]
        ? level
        : priorities[level];
    return this;
};

/**
 * Increment attempts, invoking callback `fn(remaining, attempts, max)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.attempt = function (fn) {
    var self = this
        , client = this.client
        , id = this.id
        , key = client.getKey('job:' + id);

    //TODO this now can be removed, since max_attempts is set in the constructor
    client.hsetnx(key, 'max_attempts', 1, function () {
        client.hget(key, 'max_attempts', function (err, max) {
            client.hincrby(key, 'attempts', 1, function (err, attempts) {
                fn(err, Math.max(0, max - attempts), attempts, max);
            });
        });
    });

    return this;
};

/**
 * Set max attempts to `n`.
 *
 * @param {Number} n
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.attempts = function (n) {
    this._max_attempts = n;
    return this;
};

Job.prototype.searchKeys = function (keys) {
    if (0 == arguments.length) return this._searchKeys;
    this._searchKeys = keys || [];
    if( !_.isArray( this._searchKeys ) ) {
        this._searchKeys = [this._searchKeys];
    }
    return this;
};

/**
 * Remove the job and callback `fn(err)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.remove = function (fn) {
    var client = this.client;
    this.removeState(function (err) {
        client.multi()
            .del(client.getKey('job:' + this.id + ':log'))
            .del(client.getKey('job:' + this.id))
            .zrem(client.getKey('jobs'), this.id)
        .exec( function( err ){
//            events.remove(this);
            if( !exports.disableSearch ){
                getSearch().remove(this.id, fn);
            } else {
                fn && fn(err);
            }
        }.bind(this));
    }.bind(this));
    return this;
};

/**
 * Remove state and callback `fn(err)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.removeState = function (fn) {
    var client = this.client
        , state = this._state;
    if( state && state != '' ) {
        client.multi()
            .zrem(client.getKey('jobs:' + state), this.id)
            .zrem(client.getKey('jobs:' + this.type + ':' + state), this.id)
        .exec( fn );
    } else {
        fn && fn();
    }
    return this;
};

/**
 * Set state to `state`.
 *
 * @param {String} state
 * @param fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.state = function (state, fn) {
    var client = this.client
        , fn = fn || noop;
    if( this._state && this._state != state ) {
        this.removeState();
    }
    this._state = state;
    this.set('state', state, function(){
        var multi = client.multi()
            .zadd(client.getKey('jobs:' + state), this._priority, this.id)
            .zadd(client.getKey('jobs:' + this.type + ':' + state), this._priority, this.id);
        //  increase available jobs, used by Worker#getJob()
        ('inactive' == state) ? multi.lpush(client.getKey(this.type + ':jobs'), 1) : '';
        multi.exec(function (err, replies) {
            this.set('updated_at', Date.now());
            fn( err );
        }.bind(this));
    }.bind(this));
//        }.bind(this));
//    }.bind(this));
    return this;
};

/**
 * Set the job's failure `err`.
 *
 * @param {Error} err
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.error = function (err) {
    var str, summary;
    if (0 == arguments.length) return this._error;

    if ('string' == typeof err) {
        str = err;
        summary = '';
    } else {
        str = err.stack || err.message;
        summary = str ? str.split('\n')[0] : '';
    }
    this.set('error', str);
    this.log('%s', summary);
    events.emit(this.id, 'error', str);
    return this;
};

/**
 * Set state to "complete", and progress to 100%.
 */

Job.prototype.complete = function (clbk) {
    return this.set('progress', 100).state('complete', clbk);
};

/**
 * Set state to "failed".
 */

Job.prototype.failed = function (clbk) {
    return this.set('failed_at', Date.now()).state('failed', clbk);
};

/**
 * Set state to "inactive".
 */

Job.prototype.inactive = function (clbk) {
    return this.state('inactive', clbk);
};

/**
 * Set state to "active".
 */

Job.prototype.active = function (clbk) {
    return this.state('active', clbk);
};

/**
 * Set state to "delayed".
 */

Job.prototype.delayed = function (clbk) {
    return this.state('delayed', clbk);
};

/**
 * Save the job, optionally invoking the callback `fn(err)`.
 *
 * @param {Function} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.save = function (fn) {
    var client = this.client
        , fn = fn || noop
        , max = this._max_attempts
        , self = this;

    // update
    if (this.id) return this.update(fn);

    // incr id
    client.incr(client.getKey('ids'), function (err, id) {
        if (err) return fn(err);
        // add the job for event mapping
        var key = client.getKey('job:' + id);
        self.id = id;
        self.subscribe(function () {
            self._state = self._state || (this._delay?'delayed':'inactive');
            if (max) client.hset(key, 'max_attempts', max);
            client.sadd(client.getKey('job:types'), self.type);
            self.set('type', self.type);
            self.set('created_at', Date.now());
            self.update(fn);
        }.bind(this));
    }.bind(this));
    return this;
};

/**
 * Update the job and callback `fn(err)`.
 *
 * @param {Function} fn
 * @api public
 */

Job.prototype.update = function (fn) {
    var json;

    // serialize json data
    try {
        json = JSON.stringify(this.data);
    } catch (err) {
        return fn(err);
    }

    // delay
    if (this._delay) this.set('delay', this._delay);
    if (this._removeOnComplete) this.set('removeOnComplete', this._removeOnComplete);

    if (this._backoff) {
        if (_.isPlainObject(this._backoff)) this.set('backoff', JSON.stringify(this._backoff) );
        else this.set('backoff', this._backoff.toString() );
    }


    // updated timestamp
    this.set('updated_at', Date.now());

    // priority
    this.set('priority', this._priority);

    this.client.zadd(this.client.getKey('jobs'), this._priority, this.id);

    // data
    this.set('data', json, function () {
        // state
        this.state(this._state, fn);
    }.bind(this));

    if( !exports.disableSearch ) {
        if( this.searchKeys() ) {
            this.searchKeys().forEach( function( key ){
                var value = _.deepGetValue(this.data,key);
                if( !_.isString(value) ) {
                    value = JSON.stringify( value );
                }
                getSearch().index(value, this.id);
            }.bind(this));
        } else {
            getSearch().index(json, this.id);
        }
    }
    return this;
};

/**
 * Subscribe this job for event mapping.
 *
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.subscribe = function (callback) {
    events.add(this, callback);
    return this;
};
