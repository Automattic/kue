import Ember from 'ember';

export default Ember.Component.extend({

    printJSON: function() {
       var data = this.get('data');
        $("#json").JSONView(JSON.stringify(data));
    },

    didInsertElement: function() {
        this.printJSON();
    },

    jobDidChange: function() {
        this.printJSON();
    }.observes('data')
});
