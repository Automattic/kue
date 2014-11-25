import Ember from 'ember';
import Job from '../../models/job';

export default Ember.Route.extend({

    model: function(params) {
        console.log('//////////////same route', params);
        this.controllerFor('jobs.type').set('type', params.type);
        return Job.find({
            type: params.type,
            state: 'active',
            page: 1
        });
    },

});
