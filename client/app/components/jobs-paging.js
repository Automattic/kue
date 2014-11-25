import Ember from 'ember';

export default Ember.Component.extend({

    page: 1,

    actions: {
        next: function() {
            this.incrementProperty('page');
        },

        previous: function() {
            if(this.get('page') > 1) this.decrementProperty('page');
        }
    }

});
