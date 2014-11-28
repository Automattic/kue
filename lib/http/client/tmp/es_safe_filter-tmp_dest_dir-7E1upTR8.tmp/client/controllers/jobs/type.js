import Ember from 'ember';
import JobsController from '../../mixins/jobs-controller';

export default Ember.Controller.extend(JobsController, {
    actions: {
        showDetail: job => job.set('showDetail', true),
    }
});
