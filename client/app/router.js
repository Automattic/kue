import Ember from 'ember';
import config from './config/environment';

var Router = Ember.Router.extend({
    location: config.locationType
});

Router.map(function() {
    this.route('active');
    this.route('inactive');
    this.route('failed');
    this.route('complete');
    this.route('delayed');
});

export default Router;
