import Ember from 'ember';

export default Ember.Controller.extend({
    queryParams: [ 'page'],
    page: Ember.computed(function(){return null; }),

    selectedJob: null,
    hasSelectedJob: Ember.computed.gt('selectedJob.id.length', 0),
    actions: {
        showDetail: function(job) {
            this.set('selectedJob', job);
            this.get('model').setEach('active', false);
            job.set('active', true);
        }
    }
});
