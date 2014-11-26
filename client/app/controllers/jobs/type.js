import Ember from 'ember';
import JobsController from '../../mixins/jobs-controller';

export default Ember.Controller.extend(JobsController, {
    selectedJob: null,
    hasSelectedJob: Ember.computed.gt('selectedJob.id.length', 0),
    actions: {
        showDetail: function(job) {
            this.set('selectedJob', job);
            this.get('model').setEach('active', false);
            job.set('active', true);
        }
    }
});
