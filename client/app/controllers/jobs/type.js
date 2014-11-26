import Ember from 'ember';
import JobsController from '../../mixins/jobs-controller';

export default Ember.Controller.extend(JobsController, {
    selectedJob: null,
    actions: {
        showDetail: function(job) {
            this.set('selectedJob', job);
        }
    }
});
