var json = require('./json');
var provides = require('../middleware/provides');

module.exports.autoroute = {
    get: {
        '/jobs/:from..:to/:order?': [provides('json'), json.jobRange],
        '/jobs/:type/:state/:from..:to/:order?': [provides('json'), json.jobTypeRange],
        '/jobs/:type/:state/stats': [provides('json'), json.jobTypeStateStats],
        '/jobs/:state/:from..:to/:order?': [provides('json'), json.jobStateRange]
    }
};
