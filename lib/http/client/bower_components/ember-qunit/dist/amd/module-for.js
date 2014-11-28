define(
  ["ember","./test-context","./isolated-container","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"] || __dependency1__;
    //import QUnit from 'qunit'; // Assumed global in runner
    var testContext = __dependency2__["default"] || __dependency2__;
    var isolatedContainer = __dependency3__["default"] || __dependency3__;

    __exports__["default"] = function moduleFor(fullName, description, callbacks, delegate) {
      var container;
      var context;
      
      var _callbacks = {
        setup: function(){
          callbacks = callbacks || { };

          var needs = [fullName].concat(callbacks.needs || []);
          container = isolatedContainer(needs);

          callbacks.subject   = callbacks.subject || defaultSubject;

          callbacks.setup     = callbacks.setup    || function() { };
          callbacks.teardown  = callbacks.teardown || function() { };
          
          function factory() {
            return container.lookupFactory(fullName);
          }
          
          testContext.set({
            container:            container,
            factory:              factory,
            dispatcher:           null,
            __setup_properties__: callbacks
          });
          
          context = testContext.get();

          if (delegate) {
            delegate(container, context, defaultSubject);
          }
          
          if (Ember.$('#ember-testing').length === 0) {
            Ember.$('<div id="ember-testing"/>').appendTo(document.body);
          }
          
          buildContextVariables(context);
          callbacks.setup.call(context, container);
        },

        teardown: function(){
          Ember.run(function(){
            container.destroy();
            
            if (context.dispatcher) {
              context.dispatcher.destroy();
            }
          });
          
          callbacks.teardown(container);
          Ember.$('#ember-testing').empty();
        }
      };

      QUnit.module(description || fullName, _callbacks);
    }

    function defaultSubject(options, factory) {
      return factory.create(options);
    }

    // allow arbitrary named factories, like rspec let
    function buildContextVariables(context) {
      var cache     = { };
      var callbacks = context.__setup_properties__;
      var container = context.container;
      var factory   = context.factory;
        
      Ember.keys(callbacks).filter(function(key){
        // ignore the default setup/teardown keys
        return key !== 'setup' && key !== 'teardown';
      }).forEach(function(key){
        context[key] = function(options) {
          if (cache[key]) { return cache[key]; }

          var result = callbacks[key](options, factory(), container);
          cache[key] = result;
          return result;
        };
      });
    }
  });