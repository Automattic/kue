import Ember from 'ember';

export default Ember.Component.extend({
    selections: Ember.A(['active', 'complete', 'inactive', 'failed', 'delayed']),
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
