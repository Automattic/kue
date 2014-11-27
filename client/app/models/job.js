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

    error:  "Error: [object Object]\n    at Request._callback (/app/image/lib/image.js:58:42)\n    at Request.self.callback (/app/image/node_modules/request/request.js:372:22)\n    at Request.EventEmitter.emit (events.js:98:17)\n    at Request.<anonymous> (/app/image/node_modules/request/request.js:1310:14)\n    at Request.EventEmitter.emit (events.js:117:20)\n    at IncomingMessage.<anonymous> (/app/image/node_modules/request/request.js:1258:12)\n    at IncomingMessage.EventEmitter.emit (events.js:117:20)\n    at _stream_readable.js:920:16\n    at process._tickDomainCallback (node.js:459:13)",

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
