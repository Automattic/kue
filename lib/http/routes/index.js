/*!
 * kue - http - routes
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Queue = require('../../kue')
    , Job = require('../../queue/job')
    , queue = Queue.createQueue();

/**
 * Serve the index page.
 */

exports.jobs = function (state) {
    return function (req, res) {
        queue.types(function (err, types) {
            res.render('job/list', {
                state: state, types: types, title: req.app.get('title')
            });
        });
    };
};
