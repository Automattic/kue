import Ember from 'ember';

export default Ember.Mixin.create({
    queryParams: ['state', 'sort', 'page'],
    // query params will be a separate  value for every object implementing the mixin
    state: Ember.computed(function(){return null; }),
    sort: Ember.computed(function(){return null; }),
    page: Ember.computed(function(){return null; }),
});
