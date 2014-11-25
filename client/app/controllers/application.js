import Ember from 'ember';
import Job from '../models/job';

export default Ember.Controller.extend({

    initStatsRefresh: function() {
        var self = this;
        self.updateStats(); // first call
        setInterval(() => self.updateStats(), 5000); // every 5s
    }.on('init'),

    updateStats: function() {
        var self = this;
        Job.stats().then(function(data) {
            self.set('stats', data);
        });
    },

});
