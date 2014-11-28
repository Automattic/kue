"use strict";
var moduleFor = require("./module-for")["default"] || require("./module-for");
var Ember = require("ember")["default"] || require("ember");

exports["default"] = function moduleForModel(name, description, callbacks) {
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