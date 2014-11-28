### Ember CLI Test Loader

#### What does it do?

* Adds a QUnit URL config entry for disabling JSHint.
* Any modules in `requirejs.entries` that end with `-test`.
* Any modules in `requirejs.entries` that end with `.jshint` (unless JSHint tests are disabled).
* Sets up `QUnit.notifications` if it is present.
