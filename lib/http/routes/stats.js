var json = require('./json');
var provides = require('../middleware/provides');

module.exports.autoroute = {
    get: {
        '/stats': [provides('json'), json.stats]
    }
};
