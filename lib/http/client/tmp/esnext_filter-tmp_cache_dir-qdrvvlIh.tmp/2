import Ember from 'ember';

export default Ember.Component.extend({
    selections: Ember.A(['inactive', 'complete', 'active', 'failed', 'delayed']),
    selectedState: null,
    /**
     * Proxy because state is already used
     */
    sendState: function() {
        this.set('state', this.get('selectedState'));
    }.observes('selectedState'),
});
