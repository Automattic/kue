import Ember from 'ember';

export default Ember.Route.extend({
    beforeModel: function (transition) {
        transition.abort();
        this.transitionTo('jobs.index');
    },

});
