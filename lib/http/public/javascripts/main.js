
$(function(){
  $('.bar').each(function(){
    var self = $(this)
      , n = parseInt(self.text(), 10);
    self.width(n * 5).css('opacity', 1);
  });
});