/* globals requirejs, require */

var moduleName, shouldLoad;

QUnit.config.urlConfig.push({ id: 'nojshint', label: 'Disable JSHint'});

// TODO: load based on params
for (moduleName in requirejs.entries) {
  shouldLoad = false;

  if (moduleName.match(/[-_]test$/)) { shouldLoad = true; }
  if (!QUnit.urlParams.nojshint && moduleName.match(/\.jshint$/)) { shouldLoad = true; }

  if (shouldLoad) { require(moduleName); }
}

if (QUnit.notifications) {
  QUnit.notifications({
    icons: {
      passed: '/assets/passed.png',
      failed: '/assets/failed.png'
    }
  });
}
