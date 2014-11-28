import Ember from "ember";
import config from '../config/environment';

// '/stats'
// '/job/search'
// '/jobs/:from..:to/:order?'
// '/jobs/:type/:state/:from..:to/:order?'
// '/jobs/:state/:from..:to/:order?'
// '/job/types'
// '/job/:id'
// '/job/:id/log'
// '/job/:id/state/:state'
// '/job/:id/priority/:priority'
// '/job/:id'
// '/job'
// http://localhost:3000/kue/job/3/state/delayed
/**
 * Job model
 * @class Encapsulates the JSON API for `/jobs`
 */
var Job = Ember.Object.extend({ // Instance methods

    updateState: function(state) {
        var id = this.get('id');
        state = state || this.get('state');

        return Job._request({
            method: 'PUT',
            url: `${config.apiURL}/job/${id}/state/${state}`
        });
    },

});

Job.reopenClass({ // Class methods

    STATES: Ember.A(['active', 'complete', 'delayed', 'failed', 'inactive']),

    /**
     * Request method
     * @param  {Object} opts Options
     * @return {Object}      Promise
     */
    _request: function(opts={}) {
        return new Ember.RSVP.Promise((resolve, reject) => {
            Ember.$.ajax({
                url: opts.url,
                data: opts.data,
                type: opts.method
            })
            .success(resolve)
            .fail(reject);
        });
    },

    /**
     * Find jobs
     * @param  {Object} opts Options
     * @return {Object}      Promise
     */
    find: function(opts={}) {
        var size = Number(opts.size) || 20;
        var page = Number(opts.page) || 1;
        var from = (page - 1) * size;
        var to = page * size ;

        var url = `${config.apiURL}/${from}..${to}`;

        if(opts.type && opts.state) {
            url = `${config.apiURL}/jobs/${opts.type}/${opts.state}/${from}..${to}`;
        } else if(opts.type) {
            url = `${config.apiURL}/jobs/${opts.type}/${from}..${to}`;
        } else if(opts.state) {
            url = `${config.apiURL}/jobs/${opts.state}/${from}..${to}`;
        }

        return this._request({
            data: opts.data || {},
            method: 'GET',
            url: url
        })
        .then( data => {
            if (Ember.isArray(data)) {
                return data.map( obj => Job.create(obj) );
            } else {
                return Job.create(data);
            }
        });
    },

    /**
     * FindOne Job
     * @param  {Object} opts={} Options
     * @return {Object}           Promise
     */
    findOne: function(opts={}) {
        return this._request({
            method: 'GET',
            url: `${config.apiURL}/job/${opts.id}`
        });
    },

    /**
     * Fetch stats from the Jobs
     * @return {Object} Promise
     */
    stats: function(opts={}) {
        var type = opts.type;
        var state = opts.state;
        var url = '';

        if (!Ember.empty(type) && !Ember.empty(state)) {
            url = `${config.apiURL}/jobs/${type}/${state}/stats`;
        } else {
            url = `${config.apiURL}/stats`;
        }

        return this._request({
            method: 'GET',
            url: url
        });
    },

    /**
     * Return all the job types
     * @return {Object} Promise
     */
    types: function() {
        return this._request({
            method: 'GET',
            url: `${config.apiURL}/job/types/`
        });
    },

});

export default Job;
