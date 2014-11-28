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

var app = express()
    , provides = require('./middleware/provides')
    , json = require('./routes/json');

// expose the app

module.exports = app;

// config
app.set('view options', { doctype: 'html' });
app.set('title', 'Kue');

// middleware
app.use(express.favicon());
app.use(express.static( __dirname + '/client/dist' ));
app.use(app.router);

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
app.get('/jobs/:type/:state/stats', provides('json'), json.jobTypeStateStats);

// routes
var client = function (req, res) {
    res.sendfile( __dirname + '/client/dist/index.html' );
}

app.get('/', client);
app.get('/jobs', client);
app.get('/jobs/type/:type', client);
app.get('/jobs/state/:state', client);
app.get('/jobs/:id', client);
app.get('/jobs/new', client);
