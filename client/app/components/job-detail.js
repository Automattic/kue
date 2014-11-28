import Ember from 'ember';
import Job from '../models/job';

export default Ember.Component.extend({
    selections: Job.STATES,

    setup: function() {
        this.set('job.selected', this.get('job.state'));
    }.on('didInsertElement').observes('job.id'),

    selectedStateDidChange: function() {
        if (Ember.empty(this.get('job.state'))) return;

        if (this.get('job.state') !== this.get('job.selected')) {
            this.set('job.state', this.get('job.selected'));
            this.get('job').updateState();
        }
    }.observes('job.selected'),

    actions: {
        goToJob: function(job) {
            this.sendAction("action", job);
        }
    }
});
