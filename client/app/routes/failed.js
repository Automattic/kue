import Ember from 'ember';
import Job from '../models/job';
import JobsRoute from '../mixins/jobs-route';

export default Ember.Route.extend(JobsRoute, {

    model: function(params) {
        return Job.find({
            page: params.page,
            state: 'failed'
        });
    }

 });
