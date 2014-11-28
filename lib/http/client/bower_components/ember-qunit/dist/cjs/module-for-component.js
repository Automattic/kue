"use strict";
var testResolver = require("./test-resolver")["default"] || require("./test-resolver");
var moduleFor = require("./module-for")["default"] || require("./module-for");
var Ember = require("ember")["default"] || require("ember");

exports["default"] = function moduleForComponent(name, description, callbacks) {
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