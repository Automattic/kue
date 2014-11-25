import Ember from 'ember';

export default Ember.Mixin.create({
    queryParams: ['type', 'sort', 'page'],
    type: null,
    sort: null,
    page: null,
});
