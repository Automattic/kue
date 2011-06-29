
/*!
 * q - http - main
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

// TODO: clean up
// TODO: paginate
// TODO: display more info
// TODO: server-side config for this stuff
// TODO: display attempts

/**
 * Active state.
 */

var active;

/**
 * Active page.
 */

var activePage = 0;

/**
 * Per page.
 */

var perPage = 14;

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
    activePage = 0;
    active = state;
    clearTimeout(pollForJobs.timer);
    pollForJobs(state, 2000);
  }
}

/**
 * Remove jobs from the DOM.
 */

function clear() {
  $('#content .job').remove();
}

/**
 * Paginate with `total` and `perPage`.
 *
 * @param {Type} name
 * @return {Type}
 * @api public
 */

function page(total) {
  // TODO: poll less often
  var n = total / perPage | 0
    , pager = $('#pager').children().remove().end()
    , item;

  for (var i = 0; i < n; ++i) {
    (function(i){
      item = $('<li><a href="#">' + (i + 1) + '</a></li>');
      if (i == activePage) item.addClass('active');
      item.click(function(){
        activePage = i;
        return false;
      })
      pager.append(item);
    })(i);
  }
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
    , from = activePage * perPage
    , to = (activePage + 1) * perPage;

  $('h1').text(state);
  request('/jobs/' + state + '/' + from + '..' + to, function(jobs){
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

      el.find('a.view').attr('href', '/job/' + job.id);

      el.find('a.remove').click(function(){
        removeJob(job.id, function(){
          el.fadeOut(function(){
            el.remove();
          });
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
 * Poll job `id` for stats every `ms`.
 *
 * @param {Number} id
 * @param {Number} ms
 */

function pollStatsForJob(id, ms) {
  request('/job/' + id, function(res){
    updateBar('#job-' + id + ' .bar', res.progress);
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
    page(res[active + 'Count']);
    updateBar('.inactive .bar', res.inactiveCount);
    updateBar('.active .bar', res.activeCount);
    updateBar('.complete .bar', res.completeCount);
    updateBar('.failures .bar', res.failuresCount);
    setTimeout(function(){
      pollStats(ms);
    }, ms);
  });
}

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

  if (3 == arguments.length) {
    method = url;
    url = fn;
    fn = arguments[2];
  }

  $.ajax({
      url: url
    , type: method
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

    if (!isNaN(n)) self.width(n).css('opacity', 1);
  });
}