o(function () {
    var search = o('.jobsearch');
    search.keypress(function (e) {
        if (e.which === 13) {
            var val = search.val().trim(),
                jobs = o('#jobs .job');

            // show all
            if (val.length < 2) return jobs.show();

            // query
            o.get('./job/' + encodeURIComponent(val), function (job) {
                job = new Job(job);
                el = job.showProgress('active' == active)
                    .showErrorMessage('failed' == active)
                    .render(true);
                el.get(0).job = job;
                var searchHeader = '<h3> Search Results </h3>';
                $('#content').before(searchHeader);
                el.insertBefore('#content');
            });
        }
    });
});
