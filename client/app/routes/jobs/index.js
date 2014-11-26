import Ember from 'ember';
import Job from '../../models/job';

export default Ember.Route.extend({

    model: function() {
        var self = this;
        return Job.types().then(function(types) {
            var promises = types.map(type =>  self.getAllStates(type));
            return Ember.RSVP.Promise.all(promises).then(_.flatten);
        });
    },

    getAllStates: function(type) {
        var promises = Job.STATES.map(function(state) {
            var query = { type: type, state: state };
            return Job.stats(query).then( res => _.extend(res, query) );
        });
        return Ember.RSVP.Promise.all(promises);
    }
});
