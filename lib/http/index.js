
/**
 * Module dependencies.
 */

var express = require('express');

// setup

var app = express.createServer()
  , stylus = require('stylus')
  , routes = require('./routes');

// expose the app

module.exports = app;

// config

app.set('view options', { doctype: 'html' });
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.set('title', 'Job Queue');

// middleware

app.use(express.favicon());
app.use(express.logger(':method :url - :response-timems'));
app.use(app.router);
app.use(stylus.middleware(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));

// routes

app.get('/', routes.index);