import Ember from 'ember';
import JobsRouteMixin from '../mixins/jobs-route';

export default Ember.Mixin.create(JobsRouteMixin,
{
    queryParams: {
        page: {
            refreshModel: true,
            replace: true,
        },
        sort: {
            refreshModel: true,
            replace: true
        },
        type: {
            refreshModel: true,
            replace: true
        },
    },

});
