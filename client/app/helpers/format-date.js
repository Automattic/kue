import Ember from 'ember';

export function formatDate(date) {
  return moment(Number(date)).format('D/M/YYYY H:m:s');
};

export default Ember.Handlebars.makeBoundHelper(formatDate);
