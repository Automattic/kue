
$(function(){
  resizeBars('.bar');
  request('/stats', function(res){
    console.log(res);
  })
});

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

function error(msg) {
  $('#error').text(msg).addClass('show');
  setTimeout(function(){
    $('#error').removeClass('show');
  }, 4000);
}

function resizeBars(bars) {
  $(bars).each(function(){
    var self = $(this)
      , n = parseInt(self.text(), 10);
    self.width(n * 5).css('opacity', 1);
  });
}