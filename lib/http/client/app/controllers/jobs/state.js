import Ember from 'ember';

export default Ember.Controller.extend({
    queryParams: ['page'],
    page: Ember.computed(function(){return 1;}),

    actions: {
        goToJob: function(job) {
            this.transitionToRoute('jobs.show', job);
        }
    }
});
