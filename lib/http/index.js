
/**
 * Module dependencies.
 */

var express = require('express');

// setup

var app = express.createServer()
  , routes = require('./routes');

// expose the app

module.exports = app;

// config

app.set('view options', { doctype: 'html' });
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.set('title', 'Job Queue');

// routes

app.get('/', routes.index);