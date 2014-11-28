import Ember from 'ember';
import config from '../config/environment';

export function initialize(container, application) {
  var classifiedName = Ember.String.classify(config.modulePrefix);

  if (config.exportApplicationGlobal) {
    window[classifiedName] = application;
  }
};

export default {
  name: 'export-application-global',

  initialize: initialize
};
