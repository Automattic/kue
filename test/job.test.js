
/**
 * Module dependencies.
 */

var q = require('../');

module.exports = {
  'version': function(){
    q.version.should.match(/^\d+\.\d+\.\d+$/);
  }
};