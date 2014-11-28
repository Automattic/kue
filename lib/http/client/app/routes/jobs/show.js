import Ember from 'ember';
import Job from '../../models/job';

export default Ember.Route.extend({

    model: function(params) {
        return Job.findOne({
            id: params.id
        });
    }
});
