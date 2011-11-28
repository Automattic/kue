
/*!
 * kue - http - main
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

// TODO: clean up
// TODO: server-side config for this stuff
// TODO: optimize! many of these jQuery objects can be cached

/**
 * Active state.
 */

var active;

/**
 * Active type filter.
 */

var filter;

/**
 * Number of jobs fetched when "more" is clicked.
 */

var more = 10;

/**
 * Number of jobs shown.
 */

var to = more;

/**
 * Sort order.
 */

var sort = 'asc';

/**
 * Loading indicator.
 */

var loading;

/**
 * Initialize UI.
 */

function init(state) {
  var canvas = o('#loading canvas').get(0)
    , ctx = canvas.getContext('2d');

  loading = new LoadingIndicator;
  loading.ctx = ctx;
  loading.size(canvas.width);

  pollStats(1000);
  show(state)();
  o('li.inactive a').click(show('inactive'));
  o('li.complete a').click(show('complete'));
  o('li.active a').click(show('active'));
  o('li.failed a').click(show('failed'));
  o('li.delayed a').click(show('delayed'));

  o('#filter').change(function(){
    filter = $(this).val();
  });

  o('#sort').change(function(){
    sort = $(this).val();
    o('#jobs .job').remove();
  });

  onpopstate = function(e){
    if (e.state) show(e.state.state)();
  };
}

/**
 * Show loading indicator.
 */

function showLoading() {
  var n = 0;
  o('#loading').show();
  showLoading.timer = setInterval(function(){
    loading.update(++n).draw(loading.ctx);
  }, 50);
}

/**
 * Hide loading indicator.
 */

function hideLoading() {
  o('#loading').hide();
  clearInterval(showLoading.timer);
}

/**
 * Infinite scroll.
 */

function infiniteScroll() {
  if (infiniteScroll.bound) return;
  var body = o('body');
  hideLoading();
  infiniteScroll.bound = true;

  o(window).scroll(function(e){
    var top = body.scrollTop()
      , height = body.innerHeight()
      , windowHeight = window.innerHeight
      , pad = 30;

    if (top + windowHeight + pad >= height) {
      to += more;
      infiniteScroll.bound = false;
      showLoading();
      o(window).unbind('scroll');
    }
  });
}

/**
 * Show jobs with `state`.
 *
 * @param {String} state
 * @param {Boolean} init
 * @return {Function}
 */

function show(state) {
  return function(){
    active = state;
    if (pollForJobs.timer) clearTimeout(pollForJobs.timer);
    history.pushState({ state: state }, state, state);
    o('#jobs .job').remove();
    o('#menu li a').removeClass('active');
    o('#menu li.' + state + ' a').addClass('active');
    pollForJobs(state, 2000);
    return false;
  }
}

/**
 * Poll for jobs with `state` every `ms`.
 *
 * @param {String} state
 * @param {Number} ms
 */

function pollForJobs(state, ms) {
  o('h1').text(state);
  refreshJobs(state, function(){
    infiniteScroll();
    pollForJobs.timer = setTimeout(function(){
      pollForJobs(state, ms);
    }, 1000);
  });
};

/**
 * Re-request and refresh job elements.
 *
 * @param {String} state
 * @param {Function} fn
 */

function refreshJobs(state, fn) {
  // TODO: clean this crap up
  var jobHeight = o('#jobs .job .block').outerHeight(true)
    , top = o(window).scrollTop()
    , height = window.innerHeight
    , visibleFrom = Math.max(0, Math.floor(top / jobHeight))
    , visibleTo = Math.floor((top + height) / jobHeight)
    , url = './jobs/'
    + (filter ? filter + '/' : '')
    + state + '/0..' + to
    + '/' + sort;

  // var color = ['blue', 'red', 'yellow', 'green', 'purple'][Math.random() * 5 | 0];

  request(url, function(jobs){
    var len = jobs.length
      , job
      , el;

    // remove jobs which have changed their state
    o('#jobs .job').each(function(i, el){
      var el = $(el)
        , id = (el.attr('id') || '').replace('job-', '')
        , found = jobs.some(function(job){
          return job && id == job.id;
        });
      if (!found) el.remove();
    });

    for (var i = 0; i < len; ++i) {
      if (!jobs[i]) continue;

      // exists
      if (o('#job-' + jobs[i].id).length) {
        if (i < visibleFrom || i > visibleTo) continue;
        el = o('#job-' + jobs[i].id);
        // el.css('background-color', color);
        job = el.get(0).job;
        job.update(jobs[i])
          .showProgress('active' == active)
          .showErrorMessage('failed' == active)
          .render();
      // new
      } else {
        job = new Job(jobs[i]);
        el = job.showProgress('active' == active)
          .showErrorMessage('failed' == active)
          .render(true);

        el.get(0).job = job;
        el.appendTo('#jobs');
      }
    }

    fn();
  });
}

/**
 * Poll for stats every `ms`.
 *
 * @param {Number} ms
 */

function pollStats(ms) {
  request('./stats', function(data){
    o('li.inactive .count').text(data.inactiveCount);
    o('li.active .count').text(data.activeCount);
    o('li.complete .count').text(data.completeCount);
    o('li.failed .count').text(data.failedCount);
    o('li.delayed .count').text(data.delayedCount);
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
  var method = 'GET';

  if ('string' == typeof fn) {
    method = url;
    url = fn;
    fn = arguments[2];
  }

  fn = fn || function(){};

  o.ajax({ type: method, url: url })
   .success(function(res){
      res.error
        ? error(res.error)
        : fn(res);
    });
}

/**
 * Display error `msg`.
 *
 * @param {String} msg
 */

function error(msg) {
  o('#error').text(msg).addClass('show');
  setTimeout(function(){
    o('#error').removeClass('show');
  }, 4000);
}
