/*!
 * kue - http - routes - json
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Queue = require('../../kue')
    , Job = require('../../queue/job')
    , reds = require('reds')
    , queue = Queue.createQueue();

/**
 * Search instance.
 */

var search;
function getSearch() {
    if (search) return search;
    reds.createClient = require('../../redis').createClient;
    return search = reds.createSearch(queue.client.getKey('search'));
};

/**
 * Get statistics including:
 *
 *   - inactive count
 *   - active count
 *   - complete count
 *   - failed count
 *   - delayed count
 *
 */

exports.stats = function (req, res) {
    get(queue)
        ('inactiveCount')
        ('completeCount')
        ('activeCount')
        ('failedCount')
        ('delayedCount')
        ('workTime')
    (function (err, obj) {
        if (err) return res.send({ error: err.message });
        res.send(obj);
    });
};

/**
 * Get job types.
 */

exports.types = function (req, res) {
    queue.types(function (err, types) {
        if (err) return res.send({ error: err.message });
        res.send(types);
    });
};

/**
 * Get jobs by range :from..:to.
 */

exports.jobRange = function (req, res) {
    var from = parseInt(req.params.from, 10)
        , to = parseInt(req.params.to, 10)
        , order = req.params.order;

    Job.range(from, to, order, function (err, jobs) {
        if (err) return res.send({ error: err.message });
        res.send(jobs);
    });
};

/**
 * Get jobs by :state, and range :from..:to.
 */

exports.jobStateRange = function (req, res) {
    var state = req.params.state
        , from = parseInt(req.params.from, 10)
        , to = parseInt(req.params.to, 10)
        , order = req.params.order;

    Job.rangeByState(state, from, to, order, function (err, jobs) {
        if (err) return res.send({ error: err.message });
        res.send(jobs);
    });
};

/**
 * Get jobs by :type, :state, and range :from..:to.
 */

exports.jobTypeRange = function (req, res) {
    var type = req.params.type
        , state = req.params.state
        , from = parseInt(req.params.from, 10)
        , to = parseInt(req.params.to, 10)
        , order = req.params.order;

    Job.rangeByType(type, state, from, to, order, function (err, jobs) {
        if (err) return res.send({ error: err.message });
        res.send(jobs);
    });
};

/**
 * Get job by :id.
 */

exports.job = function (req, res) {
    var id = req.params.id;
    Job.get(id, function (err, job) {
        if (err) return res.send({ error: err.message });
        res.send(job);
    });
};

/**
 * Create a job.
 */

exports.createJob = function (req, res) {
    var body = req.body;

    if (!body.type) return res.send({ error: 'Must provide job type' }, 400);

    var job = new Job(body.type, body.data || {});
    var options = body.options || {};
    if (options.attempts) job.attempts(parseInt(options.attempts));
    if (options.priority) job.priority(options.priority);
    if (options.delay) job.delay(options.delay);
    if (options.searchKeys) job.searchKeys(options.searchKeys);
    if (options.backoff) job.backoff(options.backoff);
    if (options.removeOnComplete) job.removeOnComplete(options.removeOnComplete);

    job.save(function (err) {
        if (err) return res.send({ error: err.message }, 500);
        res.send({ message: 'job created', id: job.id });
    });
};

/**
 * Remove job :id.
 */

exports.remove = function (req, res) {
    var id = req.params.id;
    Job.remove(id, function (err) {
        if (err) return res.send({ error: err.message });
        res.send({ message: 'job ' + id + ' removed' });
    });
};

/**
 * Update job :id :priority.
 */

exports.updatePriority = function (req, res) {
    var id = req.params.id
        , priority = parseInt(req.params.priority, 10);

    if (isNaN(priority)) return res.send({ error: 'invalid priority' });
    Job.get(id, function (err, job) {
        if (err) return res.send({ error: err.message });
        job.priority(priority);
        job.save(function (err) {
            if (err) return res.send({ error: err.message });
            res.send({ message: 'updated priority' });
        });
    });
};

/**
 * Update job :id :state.
 */

exports.updateState = function (req, res) {
    var id = req.params.id
        , state = req.params.state;

    Job.get(id, function (err, job) {
        if (err) return res.send({ error: err.message });
        job.state(state);
        job.save(function (err) {
            if (err) return res.send({ error: err.message });
            res.send({ message: 'updated state' });
        });
    });
};

/**
 * Search and respond with ids.
 */

exports.search = function (req, res) {
    getSearch().query(req.query.q).end(function (err, ids) {
        if (err) return res.send({ error: err.message });
        res.send(ids);
    });
};

/**
 * Get log for job :id.
 */

exports.log = function (req, res) {
    var id = req.params.id;
    Job.log(id, function (err, log) {
        if (err) return res.send({ error: err.message });
        res.send(log);
    });
};

/**
 * Data fetching helper.
 */

function get(obj) {
    var pending = 0
        , res = {}
        , callback
        , done;

    return function _(arg) {
        switch (typeof arg) {
            case 'function':
                callback = arg;
                break;
            case 'string':
                ++pending;
                obj[arg](function (err, val) {
                    if (done) return;
                    if (err) return done = true, callback(err);
                    res[arg] = val;
                    --pending || callback(null, res);
                });
                break;
        }
        return _;
    };
}
