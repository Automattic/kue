
/*!
 * q - http - main
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

// TODO: clean up
// TODO: display more info
// TODO: server-side config for this stuff

/**
 * Active state.
 */

var active;

/**
 * Initialize UI.
 */

function init() {
  resizeBars('.bar');
  pollStats(1000);
  $('li.inactive a').click(show('inactive'));
  $('li.complete a').click(show('complete'));
  $('li.active a').click(show('active'));
  $('li.failed a').click(show('failed'));
  $('#job-priority').change(function(){
    var n = $(this).val();
    request('PUT', '/job/' + currentJob + '/priority/' + n);
  });
}

/**
 * Show jobs with `state`.
 *
 * @param {String} state
 * @return {Function}
 */

function show(state) {
  return function(){
    clear();
    active = state;
    clearTimeout(pollForJobs.timer);
    clearTimeout(pollLogForJob.timer);
    clearTimeout(pollStatsForJob.timer);
    pollForJobs(state, 2000);
    history.replaceState({}, state, '/' + state);
    $('#menu li a').removeClass('active');
    $(this).addClass('active');
    return false;
  }
}

/**
 * Remove jobs from the DOM.
 */

function clear() {
  $('#content .job').remove();
}

/**
 * Poll for jobs with `state` every `ms`.
 *
 * @param {String} state
 * @param {Number} ms
 */

function pollForJobs(state, ms) {
  // TODO: clean this crap up
  var tmpl = $('#job-template').html()
    , from = 0
    , to = 15;

  $('h1').text(state);
  request('/jobs/' + state + '/' + from + '..' + to, function(jobs){
    $('#content .job').each(function(){
      var el = $(this)
        , id = el.attr('id').replace('job-', '')
        , found = jobs.some(function(job){
          return job && id == job.id;
        });
      if (!found) el.remove();
    });

    jobs.forEach(function(job){
      var el;
      if (!job) return;

      if ($('#job-' + job.id).length) {
        el = $('#job-' + job.id);
      } else {
        el = $(tmpl);
        el.attr('id', 'job-' + job.id);
        el.find('h2').text(job.id);
        el.appendTo('#content');
      }

      if (job.error && 'failed' == active) {
        el.find('.error td:last-child').text(job.error.split('\n')[0]);
      } else {
        el.find('.error').remove();
      }

      if (job.attempts) {
        el.find('.attempts').text(job.attempts);
      } else {
        el.find('.attempts').remove();
      }

      el.find('.title td:last-child').text(job.data.title
        ? job.data.title
        : 'untitled');

      el.find('a.view').attr('href', '/job/' + job.id);

      el.find('a.remove').click(function(){
        removeJob(job.id, function(){
          el.remove();
        });
      });

      el.find('.type td:last-child').text(job.type);

      if ('active' == state) {
        el.find('.progress .bar').show().text(job.progress);
        updateBar(el.find('.progress .bar'), job.progress);
      } else {
        el.find('.progress').hide();
      }
    });

    pollForJobs.timer = setTimeout(function(){
      pollForJobs(state, ms);
    }, 1000);
  });
};

/**
 * Poll job `id` for log updates.
 *
 * @param {Number} id
 * @param {Number} ms
 */

function pollLogForJob(id, ms) {
  request('/job/' + id + '/log', function(log){
    $('#log').children().remove();
    log.forEach(function(line){
      $('#log').append('<li>' + line + '</li>');
    });
    pollLogForJob.timer = setTimeout(function(){
      pollLogForJob(id, ms);
    }, ms);
  });
}

/**
 * Poll job `id` for stats every `ms`.
 *
 * @param {Number} id
 * @param {Number} ms
 */

function pollStatsForJob(id, ms) {
  request('/job/' + id, function(res){
    updateBar('#job-' + id + ' .bar', res.progress);
    pollStatsForJob.timer = setTimeout(function(){
      pollStatsForJob(id, ms);
    }, ms);
  });
}

/**
 * Poll for stats every `ms`.
 *
 * @param {Number} ms
 */

function pollStats(ms) {
  request('/stats', function(res){
    $('li.inactive .count').text(res.inactiveCount);
    $('li.active .count').text(res.activeCount);
    $('li.complete .count').text(res.completeCount);
    $('li.failed .count').text(res.failedCount);
    setTimeout(function(){
      pollStats(ms);
    }, ms);
  });
}

/**
 * Remove job `id`.
 *
 * @param {Number} id
 * @param {Function} fn
 */

function removeJob(id, fn) {
  request('DELETE', '/job/' + id, fn);
}

/**
 * Request `url` and invoke `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 */

function request(url, fn) {
  var method = 'GET';

  if ('string' == typeof fn) {
    method = url;
    url = fn;
    fn = arguments[2];
  }

  fn = fn || function(){};

  $.ajax({
      url: url
    , type: method
    , headers: { Accept: 'application/json' }
    , success: function(res){
      (res.error && !res.id)
        ? error(res.error)
        : fn(res);
    }
  });
}

/**
 * Display error `msg`.
 *
 * @param {String} msg
 */

function error(msg) {
  $('#error').text(msg).addClass('show');
  setTimeout(function(){
    $('#error').removeClass('show');
  }, 4000);
}

/**
 * Update the given `bar` with `val`.
 *
 * @param {String} bar
 * @param {String} val
 */

function updateBar(bar, val) {
  resizeBars($(bar).text(val));
}

/**
 * Resize the given `bars` to their associated values.
 *
 * @param {jQuery} bars
 */

function resizeBars(bars) {
  $(bars).each(function(){
    var self = $(this)
      , n = parseInt(self.text(), 10)
      , n = Math.min(n, 140);

    if (!isNaN(n)) self.width(n).css('opacity', 1);
  });
}