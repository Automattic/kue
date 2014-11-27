import Ember from 'ember';

export default Ember.Component.extend({
    breakdowns: Ember.A([]),

    items: function() {
        var breakdowns = this.get('breakdowns');
        var byType = _.groupBy(breakdowns, 'type');
        var menu = [];

        for(var type in byType) {
            var subItems = byType[type];
            menu.push({
                type: type,
                count: this.computeTotal(subItems),
                subItems: subItems
            })
        }
        console.log(menu)
        return menu;
    }.property('breakdowns', 'breakdowns.[]'),

    computeTotal: function(arr) {
        return arr.reduce((acc, obj) => obj.count + acc, 0);
    },
});
