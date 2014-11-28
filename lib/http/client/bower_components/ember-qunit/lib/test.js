import Ember from 'ember';
//import QUnit from 'qunit'; // Assumed global in runner
import testContext from './test-context';

function resetViews() {
  Ember.View.views = {};
}

export default function test(testName, callback) {

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

