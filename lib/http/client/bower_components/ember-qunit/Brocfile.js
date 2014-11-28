module.exports = function(broccoli) {
  return require('broccoli-dist-es6-module')(broccoli.makeTree('lib'), {
    global: 'emq',
    packageName: 'ember-qunit',
    main: 'main',
    shim: {
      'ember': 'Ember',
      'qunit': 'QUnit'
    }
  });
};

