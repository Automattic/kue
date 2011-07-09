
/*!
 * nib
 * Copyright (c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var stylus = require('stylus')
  , nodes = stylus.nodes
  , utils = stylus.utils
  , gradient
  , Canvas;

exports = module.exports = plugin;

// conditionally expose gradient api

try {
  require('canvas');
  gradient = require('./nodes/gradient');
} catch (err) {
  // ignore
}

/**
 * Library version.
 */

exports.version = '0.0.8';

/**
 * Stylus path.
 */

exports.path = __dirname;

/**
 * Return the plugin callback for stylus.
 *
 * @return {Function}
 * @api public
 */

function plugin() {
  return function(style){
    style.include(__dirname);
    if (gradient) {
      style.define('create-gradient-image', gradient.create)
      style.define('gradient-data-uri', gradient.dataURL)
      style.define('add-color-stop', gradient.addColorStop)
      style.define('has-canvas', nodes.true);
    } else {
      style.define('has-canvas', nodes.false);
    }
  }
}