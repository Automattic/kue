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
  , autoroute  = require('express-autoroute')
  , stylus     = require('stylus')
  , routes     = require('./routes')
  , jade       = require('jade')
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
app.set('view engine', 'jade');
app.engine('jade', jade.renderFile);
app.set('views', __dirname + '/views');
app.set('title', 'Kue');
app.locals     = { inspect: util.inspect };

// middlewares

app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
app.use(express.static(__dirname + '/public'));

//load autoroute files
autoroute(app, {
	routesDir: __dirname + '/routes'
});

// routes

app.get('/', routes.jobs('active'));

app.get('/active', routes.jobs('active'));
app.get('/inactive', routes.jobs('inactive'));
app.get('/failed', routes.jobs('failed'));
app.get('/complete', routes.jobs('complete'));
app.get('/delayed', routes.jobs('delayed'));
