
/*!
 * q - http - main
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

// TODO: clean up
// TODO: paginate
// TODO: display more info

/**
 * Initialize UI.
 */

function init() {
  resizeBars('.bar');
  pollStats(1000);
  $('.inactive a').click(show('inactive'));
  $('.complete a').click(show('complete'));
  $('.active a').click(show('active'));
  $('.failures a').click(show('failed'));
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
    clearTimeout(pollForJobs.timer);
    pollForJobs(state, 2000);
  }
}

/**
 * Remove jobs from the DOM.
 */

function clear() {
  $('#content .job, ').remove();
}

/**
 * Poll for jobs with `state` every `ms`.
 *
 * @param {String} state
 * @param {Number} ms
 */

function pollForJobs(state, ms) {
  var tmpl = $('#job-template').html();

  $('h1').text(state);

  request('/jobs/' + state + '/0..14', function(jobs){
    $('#content .job').each(function(){
      var el = $(this)
        , id = el.attr('id').replace('job-', '')
        , found = jobs.some(function(job){
          return id == job.id;
        });
      if (!found) el.fadeOut(function(){
        el.remove();
      });
    });

    jobs.forEach(function(job){
      var el;
      if ($('#job-' + job.id).length) {
        el = $('#job-' + job.id);
      } else {
        el = $(tmpl);
        el.attr('id', 'job-' + job.id);
        el.find('h2').text(job.id);
        el.appendTo('#content');
      }

      el.find('a').attr('href', '/job/' + job.id);
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
 * Poll job `id` for stats every `ms`.
 *
 * @param {Number} id
 * @param {Number} ms
 */

function pollStatsForJob(id, ms) {
  request('/job/' + id, function(res){
    updateBar('.job-' + id + ' .bar', res.progress);
    setTimeout(function(){
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
    updateBar('.inactive .bar', res.inactiveCount);
    updateBar('.active .bar', res.activeCount);
    updateBar('.complete .bar', res.completeCount);
    updateBar('.failures .bar', res.failuresCount);
    setTimeout(function(){
      pollStats(ms);
    }, ms);
  });
}

/**
 * Request `url` and invoke `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 */

function request(url, fn) {
  $.ajax({
      url: url
    , type: 'GET'
    , headers: { Accept: 'application/json' }
    , success: function(res){
      res.error
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
    self.width(n).css('opacity', 1);
  });
}