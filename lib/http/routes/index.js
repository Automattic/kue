
/*!
 * q - http - routes
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Queue = require('../../q')
  , Job = require('../../queue/job')
  , queue = new Queue;

/**
 * Serve the index page.
 */

exports.jobs = function(state){
  return function(req, res){
    res.render('job/list', { state: state });
  };
};

/**
 * Show job :id.
 */

exports.job = function(req, res, next){
  var id = req.params.id;
  Job.get(id, function(err, job){
    if (err) return next(err);
    if (!job) return next();
    res.render('job', { job: job });
  });
};