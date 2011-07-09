
/**
 * Module dependencies.
 */

var assert = require('assert');

var a = 0;

module.exports = {
  teardown : function (done) {
    a--;
    done();
  },
  test1 : function(done) {
    a++;
    assert.strictEqual(1, a);
    done();
  },
  test2 : function (done) {
    a++;
    assert.strictEqual(1, a);
    done();
  }
};
