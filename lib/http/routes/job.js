var bodyParser = require('body-parser');
var json = require('./json');
var provides = require('../middleware/provides');

module.exports.autoroute = {
    get: {
        '/job/search': [provides('json'), json.search],
        '/job/types': [provides('json'), json.types],
        '/job/:id': [provides('json'), json.job],
        '/job/:id/log': [provides('json'), json.log]
    },
    put: {
        '/job/:id/state/:state': [provides('json'), json.updateState],
        '/job/:id/priority/:priority': [provides('json'), json.updatePriority]
    },
    post: {
        '/job': [provides('json'), bodyParser.json(), json.createJob]
    },
    delete: {
        '/job/:id': [provides('json'), json.remove]
    }
};
