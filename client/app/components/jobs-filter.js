import Ember from 'ember';
import Job from '../models/job';

export default Ember.Component.extend({
    selections: Job.STATES,
    selectedState: null,

    sorts: Ember.A(['created_at', 'updated_at']),
    selectedSort: null,

    /**
     * Proxy because state is already used
     */
    sendState: function() {
        this.set('state', this.get('selectedState'));
    }.observes('selectedState'),
});
