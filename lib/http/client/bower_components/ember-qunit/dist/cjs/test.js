"use strict";
var Ember = require("ember")["default"] || require("ember");
//import QUnit from 'qunit'; // Assumed global in runner
var testContext = require("./test-context")["default"] || require("./test-context");

function resetViews() {
  Ember.View.views = {};
}

exports["default"] = function test(testName, callback) {

  function wrapper() {
    var context = testContext.get();
    
    resetViews();
    var result = callback.call(context);

    function failTestOnPromiseRejection(reason) {
      ok(false, reason);
    }

    Ember.run(function(){
      stop();
      Ember.RSVP.Promise.cast(result)['catch'](failTestOnPromiseRejection)['finally'](start);
    });
  }

  QUnit.test(testName, wrapper);
}