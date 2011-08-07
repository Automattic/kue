
o(function(){
  var search = o('#search');
  search.keyup(function(){
    var val = search.val().trim()
      , jobs = o('#jobs .job');

    // show all
    if (val.length < 2) return jobs.show();

    // query
    o.get('./job/search?q=' + encodeURIComponent(val), function(ids){
      jobs.each(function(i, el){
        var id = el.id.replace('job-', '');
        if (~ids.indexOf(id)) {
          o(el).show();
        } else {
          o(el).hide();
        }
      });
    });
  });
});
