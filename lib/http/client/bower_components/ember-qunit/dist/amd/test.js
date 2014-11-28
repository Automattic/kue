define(
  ["ember","./test-context","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"] || __dependency1__;
    //import QUnit from 'qunit'; // Assumed global in runner
    var testContext = __dependency2__["default"] || __dependency2__;

    function resetViews() {
      Ember.View.views = {};
    }

    __exports__["default"] = function test(testName, callback) {

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
  });