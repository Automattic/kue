"use strict";
var testResolver = require("./test-resolver")["default"] || require("./test-resolver");
var Ember = require("ember")["default"] || require("ember");

exports["default"] = function isolatedContainer(fullNames) {
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