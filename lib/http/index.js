
/*!
 * q - http
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var express = require('express');

// setup

var app = express.createServer()
  , provides = require('./middleware/provides')
  , stylus = require('stylus')
  , routes = require('./routes')
  , json = require('./routes/json')
  , util = require('util')
  , nib = require('nib');

// expose the app

module.exports = app;

// stylus config

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}

// config

app.set('view options', { doctype: 'html' });
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.set('title', 'Kue');
app.helpers({ inspect: util.inspect });

// middleware

app.use(express.favicon());
app.use(app.router);
app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
app.use(express.static(__dirname + '/public'));

// JSON api

app.get('/stats', provides('json'), json.stats);
app.get('/job/search', provides('json'), json.search);
app.get('/jobs/:from..:to/:order?', provides('json'), json.jobRange);
app.get('/jobs/:type/:state/:from..:to/:order?', provides('json'), json.jobTypeRange);
app.get('/jobs/:state/:from..:to/:order?', provides('json'), json.jobStateRange);
app.get('/job/types', provides('json'), json.types);
app.get('/job/:id', provides('json'), json.job);
app.get('/job/:id/log', provides('json'), json.log);
app.put('/job/:id/state/:state', provides('json'), json.updateState);
app.put('/job/:id/priority/:priority', provides('json'), json.updatePriority);
app.del('/job/:id', provides('json'), json.remove);
app.post('/job', provides('json'), express.bodyParser(), json.createJob);

// routes

var auth = function(req, res, next) {
  if (!app.settings.auth) return next();
  express.basicAuth(app.settings.auth[0], app.settings.auth[1])(req,res,next);
}
app.get('/', auth, routes.jobs('active'));
app.get('/active', auth, routes.jobs('active'));
app.get('/inactive', auth, routes.jobs('inactive'));
app.get('/failed', auth, routes.jobs('failed'));
app.get('/complete', auth, routes.jobs('complete'));
app.get('/delayed', auth, routes.jobs('delayed'));
