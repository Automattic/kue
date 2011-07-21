
/*!
 * kue - utils
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Format `ms` in words.
 *
 * @param {Number} ms
 * @return {String}
 */

function relative(ms) {
  var sec = 1000
    , min = 60 * sec
    , hour = 60 * min;

  function n(n, name) {
    n = Math.round(n);
    return n + ' ' + name + (n > 1 ? 's' : '');
  }

  if (isNaN(ms)) return '';
  if (ms < sec) return 'less than one second';
  if (ms < min) return n(ms / sec, 'second');
  if (ms < hour) return n(ms / min, 'minute');
  return n(ms / hour, 'hour');
  // TODO: larger than an hour or so, we should
  // have some nice date formatting
}

/**
 * Default job states.
 */

var states = {
    active: 'active'
  , inactive: 'inactive'
  , failed: 'failed'
  , complete: 'complete'
  , delayed: 'delayed'
};

/**
 * Default job priority map.
 */

var priorities = {
    '10': 'low'
  , '0': 'normal'
  , '-5': 'medium'
  , '-10': 'high'
  , '-15': 'critical'
};

/**
 * Return priority string for `job`.
 *
 * @param {Job} job
 * @return {String}
 */

function priority(job){
  return priorities[job.priority] || job.priority;
}

/**
 * Generate options from `obj`.
 *
 * @param {Object} obj
 * @param {String} selected
 * @return {String}
 */

function options(obj, selected) {
  var html = '';
  for (var key in obj) {
    html += '<option value="' + key + '" '
      + (key == selected ? 'selected="selected"' : '')
      + '>' + obj[key] + '</option>\n';
  }
  return html;
}
