import Ember from 'ember';
import Job from '../../models/job';

export default Ember.Route.extend({
    queryParams: {
        page: { refreshModel: true },
    },

    model: function(params) {
        this.controllerFor('application').set('type', null);
        this.controllerFor('application').set('state', params.stateId);
        return Job.find({
            state: params.stateId,
            page: params.page,
        });
    },

    activate: function() {
        this._super();
        window.scrollTo(0,0);
    }

});
