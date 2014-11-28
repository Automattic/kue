define(
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
  });