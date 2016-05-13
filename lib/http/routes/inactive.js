var json = require('./json');
var provides = require('../middleware/provides');

module.exports.autoroute = {
    get: {
        '/inactive/:id': [provides('json'), json.inactive]
    }
};
