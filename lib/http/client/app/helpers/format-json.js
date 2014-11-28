import Ember from 'ember';

export function formatJson(input) {
    var str = JSON.stringify(input, undefined, 2);
    return str.replace(/ /g, '&nbsp').htmlSafe();
}

export default Ember.Handlebars.makeBoundHelper(formatJson);
