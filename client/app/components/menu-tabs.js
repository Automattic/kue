import Ember from 'ember';

export default Ember.Component.extend({
    breakdowns: Ember.A([]),
    selected: null,
    items: null,
    menuTree: null,

    paramsDidChange: function(){
        this.updateActiveState();
        this.rerender();
    }.observes('typeParam', 'stateParam', 'menuTree', 'menuTree.[]'),

    breakdownsDidLoad: function() {
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
        this.set('menuTree', menu);
    }.observes('breakdowns', 'breakdowns.[]'),

    computeTotal: function(arr) {
        return arr.reduce((acc, obj) => obj.count + acc, 0);
    },

    updateActiveState: function() {
        var selected = {
            state: this.get('stateParam'),
            type: this.get('typeParam'),
        };
        var items = this.get('menuTree');

        items = items.map(item => {
            item.active = item.type === selected.type;

            item.subItems = item.subItems.map(sub => {
                sub.active = sub.state === selected.state && sub.type === selected.type;
                sub.hide = !item.active;
                return sub;
            });
            return item;
        });


        this.set('items', items);
    },

    actions: {
        goToItem: function(item) {
            this.sendAction("action", item);
        },

    }
});
