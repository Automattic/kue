import Ember from 'ember';
import Job from '../../models/job';

export default Ember.Route.extend({

    model: function(params) {
        return Job.find({
            type: params.type,
            state: 'active',
            page: 1
        });
    }
});
