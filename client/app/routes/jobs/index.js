import Ember from 'ember';
import Job from '../../models/job';

export default Ember.Route.extend({

    model: function() {
        return Job.stats();
    },
});
