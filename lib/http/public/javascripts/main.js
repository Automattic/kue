
$(function(){
  resizeBars('.bar');
  pollStats(1000);

  $('.inactive a').click(function(){
    pollForJobs('inactive');
  }).click();
  
  $('.complete a').click(function(){
    pollForJobs('complete');
  });

  $('.active a').click(function(){
    pollForJobs('active');
  });

  $('.failures a').click(function(){
    pollForJobs('failed');
  });
});

function pollForJobs(state) {
  var tmpl = $('#job-template').html();
  request('/jobs/' + state + '/0..4', function(jobs){
    jobs.forEach(function(job){
      var el = $(tmpl);
      el.attr('id', 'job-' + job.id);
      el.find('h2').text(job.id);
      if ('active' == state) {
        el.find('.progress .bar').show().text(job.progress);
        updateBar(el.find('.progress .bar'), job.progress);
      } else {
        el.find('.progress').hide();
      }
      el.appendTo('#content');
    });
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