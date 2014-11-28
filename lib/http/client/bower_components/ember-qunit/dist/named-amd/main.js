define("ember-qunit/isolated-container",
  ["./test-resolver","ember","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var testResolver = __dependency1__["default"] || __dependency1__;
    var Ember = __dependency2__["default"] || __dependency2__;

    __exports__["default"] = function isolatedContainer(fullNames) {
      var resolver = testResolver.get();
      var container = new Ember.Container();
      container.optionsForType('component', { singleton: false });
      container.optionsForType('view', { singleton: false });
      container.optionsForType('template', { instantiate: false });
      container.optionsForType('helper', { instantiate: false });
      container.register('component-lookup:main', Ember.ComponentLookup);
      for (var i = fullNames.length; i > 0; i--) {
        var fullName = fullNames[i - 1];
        container.register(fullName, resolver.resolve(fullName));
      }
      return container;
    }
  });define("ember-qunit",
  ["ember","./isolated-container","./module-for","./module-for-component","./module-for-model","./test","./test-resolver","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __dependency7__, __exports__) {
    "use strict";
    var Ember = __dependency1__["default"] || __dependency1__;
    var isolatedContainer = __dependency2__["default"] || __dependency2__;
    var moduleFor = __dependency3__["default"] || __dependency3__;
    var moduleForComponent = __dependency4__["default"] || __dependency4__;
    var moduleForModel = __dependency5__["default"] || __dependency5__;
    var test = __dependency6__["default"] || __dependency6__;
    var testResolver = __dependency7__["default"] || __dependency7__;

    Ember.testing = true;

    function setResolver(resolver) {
      testResolver.set(resolver);
    }

    function globalize() {
      window.moduleFor = moduleFor;
      window.moduleForComponent = moduleForComponent;
      window.moduleForModel = moduleForModel;
      window.test = test;
      window.setResolver = setResolver;
    }

    __exports__.globalize = globalize;
    __exports__.moduleFor = moduleFor;
    __exports__.moduleForComponent = moduleForComponent;
    __exports__.moduleForModel = moduleForModel;
    __exports__.test = test;
    __exports__.setResolver = setResolver;
  });define("ember-qunit/module-for-component",
  ["./test-resolver","./module-for","ember","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var testResolver = __dependency1__["default"] || __dependency1__;
    var moduleFor = __dependency2__["default"] || __dependency2__;
    var Ember = __dependency3__["default"] || __dependency3__;

    __exports__["default"] = function moduleForComponent(name, description, callbacks) {
      var resolver = testResolver.get();

      moduleFor('component:' + name, description, callbacks, function(container, context, defaultSubject) {
        var layoutName = 'template:components/' + name;

        var layout = resolver.resolve(layoutName);

        if (layout) {
          container.register(layoutName, layout);
          container.injection('component:' + name, 'layout', layoutName);
        }

        context.dispatcher = Ember.EventDispatcher.create();
        context.dispatcher.setup({}, '#ember-testing');

        context.__setup_properties__.append = function(selector) {
          var containerView = Ember.ContainerView.create({container: container});
          var view = Ember.run(function(){
            var subject = context.subject();
            containerView.pushObject(subject);
            // TODO: destory this somewhere
            containerView.appendTo('#ember-testing');
            return subject;
          });

          return view.$();
        };
        context.__setup_properties__.$ = context.__setup_properties__.append;
      });
    }
  });define("ember-qunit/module-for-model",
  ["./module-for","ember","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var moduleFor = __dependency1__["default"] || __dependency1__;
    var Ember = __dependency2__["default"] || __dependency2__;

    __exports__["default"] = function moduleForModel(name, description, callbacks) {
      moduleFor('model:' + name, description, callbacks, function(container, context, defaultSubject) {
        if (DS._setupContainer) {
          DS._setupContainer(container);
        } else {
          container.register('store:main', DS.Store);
        }

        var adapterFactory = container.lookupFactory('adapter:application');
        if (!adapterFactory) {
          container.register('adapter:application', DS.FixtureAdapter);
        }

        context.__setup_properties__.store = function(){
          return container.lookup('store:main');
        };

        if (context.__setup_properties__.subject === defaultSubject) {
          context.__setup_properties__.subject = function(options) {
            return Ember.run(function() {
              return container.lookup('store:main').createRecord(name, options);
            });
          };
        }
      });
    }
  });define("ember-qunit/module-for",
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
  });define("ember-qunit/test-context",
  ["exports"],
  function(__exports__) {
    "use strict";
    var __test_context__;

    function set(context) {
      __test_context__ = context;
    }

    __exports__.set = set;function get() {
      return __test_context__;
    }

    __exports__.get = get;
  });define("ember-qunit/test-resolver",
  ["exports"],
  function(__exports__) {
    "use strict";
    var __resolver__;

    function set(resolver) {
      __resolver__ = resolver;
    }

    __exports__.set = set;function get() {
      if (__resolver__ == null) throw new Error('you must set a resolver with `testResolver.set(resolver)`');
      return __resolver__;
    }

    __exports__.get = get;
  });define("ember-qunit/test",
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