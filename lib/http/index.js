
/**
 * Module dependencies.
 */

var express = require('express');

// setup

var app = express.createServer()
  , stylus = require('stylus')
  , routes = require('./routes')
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
app.set('title', 'Job Queue');

// middleware

app.use(express.favicon());
app.use(express.logger(':method :url :status - :response-timems'));
app.use(app.router);
app.use(stylus.middleware({ src: __dirname + '/public', compile: compile }));
app.use(express.static(__dirname + '/public'));

// routes

app.get('/', routes.index);
app.get('/stats', routes.stats);
app.get('/jobs/:type/:status/:from..:to', routes.jobs);
app.get('/job/types', routes.types);
app.get('/job/:id', routes.job);