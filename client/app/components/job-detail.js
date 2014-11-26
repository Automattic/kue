import Ember from 'ember';
import Job from '../models/job';

export default Ember.Component.extend({
    selections: Job.STATES,
    selected: null,

    initSelection: function() {
        this.set('selected', this.get('job.state'));
    }.observes('job.id'),

    selectedStateDidChange: function() {
        if (Ember.empty(this.get('job.state'))) return;

        if (this.get('job.state') !== this.get('selected')) {
            this.set('job.state', this.get('selected'));
            this.get('job').updateState();
        }
    }.observes('selected')
});
