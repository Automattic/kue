import Ember from 'ember';

export function formatDate(date) {
  return moment(Number(date)).format('DD/MM/YYYY HH:mm:ss');
}

export default Ember.Handlebars.makeBoundHelper(formatDate);
