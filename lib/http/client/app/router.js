import Ember from 'ember';
import config from './config/environment';

var Router = Ember.Router.extend({
    location: config.locationType
});

Router.map(function() {
    this.route('jobs', function() {
        this.route('type', { path: "type/:type" });
        this.route('state', { path: "state/:stateId" });
        this.route('show', { path: ":id" });
        this.route('new', { path: "/new" });
    });
});

export default Router;
