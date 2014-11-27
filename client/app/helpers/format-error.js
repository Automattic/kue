import Ember from 'ember';

export function formatError(input) {
  return input;
}

export default Ember.Handlebars.makeBoundHelper(formatError);
