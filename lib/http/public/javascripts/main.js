
/*!
 * q - http - main
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

// TODO: test errors again
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

function init(state) {
  pollStats(1000);
  show(state)();
  o('li.inactive a').click(show('inactive'));
  o('li.complete a').click(show('complete'));
  o('li.active a').click(show('active'));
  o('li.failed a').click(show('failed'));
  o('#job-priority').change(function(){
    var n = this.val();
    request('PUT', '/job/' + currentJob + '/priority/' + n);
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
    clear();
    active = state;
    clearTimeout(pollForJobs.timer);
    clearTimeout(pollLogForJob.timer);
    clearTimeout(pollStatsForJob.timer);
    pollForJobs(state, 2000);
    history.pushState({ state: state }, state, state);
    o('#menu li a').removeClass('active');
    o('#menu li.' + state + ' a').addClass('active');
    return false;
  }
}

/**
 * Remove jobs from the DOM.
 */

function clear() {
  o('#content .job').remove();
}

/**
 * Poll for jobs with `state` every `ms`.
 *
 * @param {String} state
 * @param {Number} ms
 */

function pollForJobs(state, ms) {
  // TODO: clean this crap up
  var from = 0
    , to = 15;

  o('h1').text(state);
  request('/jobs/' + state + '/' + from + '..' + to, function(res, jobs){
    o('#content .job').each(function(el){
      var id = el.id().replace('job-', '')
        , found = jobs.some(function(job){
          return job && id == job.id;
        });
      if (!found) el.remove();
    });

    jobs.forEach(function(data){
      var job = new Job(data);
      job.showProgress('active' == active)
        .showErrorMessage('failed' == active)
        .render()
        .appendTo('#content');
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
    o('#log').children().remove();
    log.forEach(function(line){
      o('#log').append('<li>' + line + '</li>');
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
