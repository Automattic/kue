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

var app        = express()
  , bodyParser = require('body-parser')
  , provides   = require('./middleware/provides')
  , stylus     = require('stylus')
  , routes     = require('./routes')
  , pug       = require('pug')
  , json       = require('./routes/json')
  , util       = require('util')
  , nib        = require('nib');

// expose the app

module.exports = app;

// stylus config

function compile( str, path ) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}

// config

app.set('view options', { doctype: 'html' });
app.set('view engine', 'pug');
app.engine('pug', pug.renderFile);
app.set('views', __dirname + '/views');
app.set('title', 'Kue');
app.locals     = { inspect: util.inspect };

// middlewares

app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
app.use(express.static(__dirname + '/public'));

// JSON api

app.get('/stats', provides('json'), json.stats);
app.get('/job/search', provides('json'), json.search);
app.get('/jobs/:from..:to/:order?', provides('json'), json.jobRange);
app.get('/jobs/:type/:state/:from..:to/:order?', provides('json'), json.jobTypeRange);
app.get('/jobs/:type/:state/stats', provides('json'), json.jobTypeStateStats);
app.get('/jobs/:state/:from..:to/:order?', provides('json'), json.jobStateRange);
app.get('/job/types', provides('json'), json.types);
app.get('/job/:id', provides('json'), json.job);
app.get('/job/:id/log', provides('json'), json.log);
app.put('/job/:id/state/:state', provides('json'), json.updateState);
app.put('/job/:id/priority/:priority', provides('json'), json.updatePriority);
app.delete('/job/:id', provides('json'), json.remove);
app.post('/job', provides('json'), bodyParser.json(), json.createJob);
app.get('/inactive/:id', provides('json'), json.inactive);

// routes

app.get('/', routes.jobs('active'));

app.get('/active', routes.jobs('active'));
app.get('/inactive', routes.jobs('inactive'));
app.get('/failed', routes.jobs('failed'));
app.get('/complete', routes.jobs('complete'));
app.get('/delayed', routes.jobs('delayed'));
