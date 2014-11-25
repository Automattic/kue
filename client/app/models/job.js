import Ember from "ember";
import config from '../config/environment';

/**
 * Job model
 * @class Encapsulates the JSON API for `/jobs`
 */
var Job = Ember.Object.extend({ // Instance methods

    dataJSON: function() {
        return JSON.stringify(this.get('data'), null, 4);
    }.property('data')
});

Job.reopenClass({ // Class methods

    /**
     * Request method
     * @param  {Object} opts Options
     * @return {Object}      Promise
     */
    _request: function(opts) {
        return new Ember.RSVP.Promise((resolve, reject) => {
            Ember.$.ajax({
                url: opts.url,
                data: opts.data,
                type: opts.method
            })
            .success( data => {
                if (Ember.isArray(data)) {
                    resolve(data.map( obj => Job.create(obj) ));
                } else {
                    resolve(Job.create(data));
                }
            })
            .fail(reject);
        });
    },

    /**
     * Find jobs
     * @param  {Object} opts Options
     * @return {Object}      Promise
     */
    find: function(opts) {
        var size = Number(opts.size) || 10;
        var page = Number(opts.page) || 1;
        var from = (page - 1) * size;
        var to = page * size ;

        var url = `${config.apiURL}/jobs/${opts.state}/${from}..${to}`;

        return this._request({
            data: opts.data || {},
            method: 'GET',
            url: url
        });
    },

    /**
     * Fetch stats from the Jobs
     * @return {Object} Promise
     */
    stats: function() {
        return this._request({
            method: 'GET',
            url: `${config.apiURL}/stats`
        });
    },

});

export default Job;
