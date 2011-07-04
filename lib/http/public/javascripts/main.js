
/*!
 * kue - http - main
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

// TODO: clean up
// TODO: server-side config for this stuff

/**
 * Active state.
 */

var active;

/**
 * Number of jobs fetched when "more" is clicked.
 */

var more = 10;

/**
 * Number of jobs shown.
 */

var to = more;

/**
 * Initialize UI.
 */

function init(state) {
  pollStats(1000);
  show(state)();
  o('li.inactive a').click(show('inactive'));
  o('li.complete a').click(show('complete'));
  o('li.active a').click(show('active'));
  o('li.failed a').click(show('failed'));

  o('#more').click(function(){
    to += more;
    return false;
  });
  onpopstate = function(e){
    if (e.state) show(e.state.state)();
  };
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
    o('#more').hide();
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
  // TODO: clean this crap up
  o('h1').text(state);
  request('/jobs/' + state + '/0..' + to, function(res, jobs){
    var len = jobs.length
      , job
      , el;

    // enough jobs to show "more" button
    if (len >= more) o('#more').show();

    // remove jobs which have changed their state
    o('#jobs .job').each(function(el){
      var id = el.id().replace('job-', '')
        , found = jobs.some(function(job){
          return job && id == job.id;
        });
      if (!found) el.remove();
    });

    for (var i = 0; i < len; ++i) {
      // exists
      if (o('#job-' + jobs[i].id).length()) {
        el = o('#job-' + jobs[i].id);
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

    pollForJobs.timer = setTimeout(function(){
      pollForJobs(state, ms);
    }, 1000);
  });
};

/**
 * Poll for stats every `ms`.
 *
 * @param {Number} ms
 */

function pollStats(ms) {
  request('/stats', function(res, data){
    o('li.inactive .count').text(data.inactiveCount);
    o('li.active .count').text(data.activeCount);
    o('li.complete .count').text(data.completeCount);
    o('li.failed .count').text(data.failedCount);
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

  o.request(method, url)
   .header('Accept', 'application/json')
   .end(function(res, data){
      (res.error && !data.id)
        ? error(res.error)
        : fn(res, data);
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
