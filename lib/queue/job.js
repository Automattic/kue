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
    , noop = function () {
    };

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
    return search = reds.createSearch('q:search');
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
                if (err)
                /*fn*/console.log(err);
                else
                    jobs[job.id] = job;
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
    redis.client().zrange('q:jobs', from, to, get(fn, order));
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
    redis.client().zrange('q:jobs:' + state, from, to, get(fn, order));
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
    redis.client().zrange('q:jobs:' + type + ':' + state, from, to, get(fn, order));
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
    client.hgetall('q:job:' + job.id, function (err, hash) {
        if (err) return fn(err);
        if (!hash) return fn(new Error('job "' + job.id + '" doesnt exist'));
        if (!hash.type) return fn(new Error('job "' + job.id + '" is invalid'));
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
        try {
            if (hash.data) job.data = JSON.parse(hash.data);
        } catch (e) {
            err = e;
        }
        fn(err, job);
    });
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
    redis.client().lrange('q:job:' + id + ':log', 0, -1, fn);
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
    this.client = Job.client || (Job.client = redis.client());
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
            made: this._attempts
          , remaining: this._max_attempts - this._attempts
          , max: this._max_attempts
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

    this.client.rpush('q:job:' + this.id + ':log', str);
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
    this.client.hset('q:job:' + this.id, key, val, fn || noop);
    return this;
};

/**
 * Get job `key`
 *
 * @param {String} key
 * @param {String} fn
 * @return {Job} for chaining
 * @api public
 */

Job.prototype.get = function (key, fn) {
    this.client.hget('q:job:' + this.id, key, fn || noop);
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
    this._state = 'delayed';
    return this;
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
        , key = 'q:job:' + id;

    client.hsetnx(key, 'max_attempts', 1, function () {
        client.hget(key, 'max_attempts', function (err, max) {
            client.hincrby(key, 'attempts', 1, function (err, attempts) {
                self.set('updated_at', Date.now());
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
        client.del('q:job:' + this.id + ':log');
        client.del('q:job:' + this.id);
//        multi.exec(function (err, replies) {
//        events.remove(this);
        fn && fn(err);
        if( !exports.disableSearch ){
            getSearch().remove(this.id);
        }
//        }.bind(this));
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
//    console.log( "removeState(%d) START ", this.id, state, this._state );
//    var multi = client.multi();
    client.zrem('q:jobs', this.id);
    client.zrem('q:jobs:' + state, this.id);
    client.zrem('q:jobs:' + this.type + ':' + state, this.id);
//    multi.exec(function (err, replies) {
//        console.log( "removeState(%d) END ", this.id, state, this._state/*, replies*/ );
    fn && fn(/*err*/);
//    }.bind(this));
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
    this.removeState(function () {
        this._state = state;
//        console.log( "setState(%d) Start ", this.id, state, this._state );
//        var multi = client.multi();
        client.zadd('q:jobs', this._priority, this.id);
        client.zadd('q:jobs:' + state, this._priority, this.id);
        client.zadd('q:jobs:' + this.type + ':' + state, this._priority, this.id);
//        multi.exec(function (err, replies) {
//            console.log( "setState(%d) End ", this.id, state, this._state/*, replies*/ );
        this.set('updated_at', Date.now());
        this.set('state', state, function(){
            //  increase available jobs, used by Worker#getJob()
            ('inactive' == state) ? client.lpush('q:' + this.type + ':jobs', 1, fn) : fn();
        }.bind(this));
//        }.bind(this));
    }.bind(this));
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

    this.set('failed_at', Date.now());
    this.set('error', str);
    this.log('%s', summary);
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
    return this.state('failed', clbk);
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
    client.incr('q:ids', function (err, id) {
        if (err) return fn(err);
        // add the job for event mapping
        var key = 'q:job:' + id;
        self.id = id;
        self.subscribe(function () {
            self._state = self._state || 'inactive';
            if (max) client.hset(key, 'max_attempts', max);
            client.sadd('q:job:types', self.type);
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

    // updated timestamp
    this.set('updated_at', Date.now());

    // priority
    this.set('priority', this._priority);

    // data
    this.set('data', json, function () {
        // state
        this.state(this._state, fn);
    }.bind(this));

    if( !exports.disableSearch ) {
      getSearch().index(json, this.id);
    }
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
