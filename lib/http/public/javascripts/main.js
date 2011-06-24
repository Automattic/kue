
$(function(){
  resizeBars('.bar');
  pollStats(1000);
  pollStatsForJob(1, 1000);
});

function pollStatsForJob(id, ms) {
  request('/job/' + id + '/stats', function(res){
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
      , n = Math.min(n, 220);
    self.width(n).css('opacity', 1);
  });
}