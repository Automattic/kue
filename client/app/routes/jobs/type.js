import Ember from 'ember';
import Job from '../../models/job';
import JobsRoute from '../../mixins/jobs-route';

export default Ember.Route.extend(JobsRoute, {

    model: function(params) {
        this.controllerFor('jobs.type').set('type', params.type);
        this.controllerFor('jobs.type').set('state', params.state);
        return Job.find({
            type: params.type,
            state: params.state,
            page: params.page,
            sort: params.sort
        });
    },

});
