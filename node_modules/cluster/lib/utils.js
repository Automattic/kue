
/*!
 * Cluster - utils
 * Copyright (c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Frame the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

exports.frame = function(obj){
  return JSON.stringify(obj) + '\n';
};

/**
 * Fast alternative to `Array.prototype.slice.call()`.
 *
 * @param {Arguments} args
 * @param {Number} index
 * @return {Array}
 * @api private
 */

exports.toArray = function(args, index){
  var arr = []
    , len = args.length;
  for (var i = (index || 0); i < len; ++i) {
    arr.push(args[i]);
  }
  return arr;
};

/**
 * Format byte-size.
 *
 * @param {Number} bytes
 * @return {String}
 * @api private
 */

exports.formatBytes = function(bytes) {
  var kb = 1024
    , mb = 1024 * kb
    , gb = 1024 * mb;
  if (bytes < kb) return bytes + 'b';
  if (bytes < mb) return (bytes / kb).toFixed(2) + 'kb';
  if (bytes < gb) return (bytes / mb).toFixed(2) + 'mb';
  return (bytes / gb).toFixed(2) + 'gb';
};

/**
 * Format date difference between `a` and `b`.
 *
 * @param {Date} a
 * @param {Date} b
 * @return {String}
 * @api private
 */

exports.formatDateRange = function(a, b) {
  var diff = a > b ? a - b : b - a
    , second = 1000
    , minute = second * 60
    , hour = minute * 60
    , day = hour * 24;

  function unit(name, n) {
    return n + ' ' + name + (1 == n ? '' : 's'); 
  }

  if (diff < second) return unit('millisecond', diff);
  if (diff < minute) return unit('second', (diff / second).toFixed(0));
  if (diff < hour) return unit('minute', (diff / minute).toFixed(0));
  if (diff < day) return unit('hour', (diff / hour).toFixed(0));
  return unit('day', (diff / day).toFixed(1));
};

/**
 * Unshift a callback.
 *
 * @param {Object} obj
 * @param {String} event
 * @param {String} fn
 * @api private
 */

exports.unshiftListener = function(obj, event, fn){
  if (Array.isArray(obj._events[event])) {
    obj._events[event].unshift(fn);
  } else {
    obj._events[event] = [fn, obj._events[event]];
  }
};