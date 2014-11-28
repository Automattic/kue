# QUnit Notifications

## About

Adds [Web Notification](http://www.w3.org/TR/notifications) support to your Qunit test suite

A new `Notifications` checkbox will be added to the QUnit toolbar

![checkbox](http://i.imgur.com/fALfiQF.png)

And after the tests complete a notification will appear with some
information on the state of the test suite:

![state](http://i.imgur.com/JGNgoOu.png)

Notifications are off by default, and **will not appear if your browser
does not support Web Notifications**

They are best used when you do not want to keep switching back to your
browser to see the result of the test suite. Stay in your favorite
development environment and keep TDDing!

## Usage

```javascript
QUnit.notifications();
```

You can pass in an options hash to customize the notification messages:

```javascript
QUnit.notifications({
  timeout: 5000,
  titles: {
    passed: 'It worked!',
    failed: 'Fix your code!'
  }
});
```

### Options

#### `icons`

URL to `passed` and `failed` images for use in the notification

*Default*: `{}`

Example:

```javascript
QUnit.notifications({
  icons: {
    passed: '/assets/passed.png',
    failed: '/assets/failed.png'
  }
});
```

#### `timeout`

Time in miliseconds for notification to disappear

*Default*: `4000`

Example:

```javascript
QUnit.notifications({
  timeout: 5000
});
```

#### `titles`

Customize the notification titles

*Default*: `{passed: 'Passed!', failed: 'Failed!'}`

Example:

```javascript
QUnit.notifications({
  titles: {
    passed: 'It worked!',
    failed: 'Fix your code!'
  }
});
```

#### `bodies`

Customize the notification bodies. Will substitue from [QUnit's test suite details object](http://api.qunitjs.com/QUnit.done).

*Default*: `{ passed: '{{passed}} of {{total}} passed', failed: '{{passed}} passed. {{failed}} failed.' }`

Example:

```javascript
QUnit.notifications({
  bodies: {
    passed: '{{passed}} of {{total}} passed in {{runtime}}ms',
    failed: '{{failed}} of {{total}} failed in {{{runtime}}ms'
  }
});
```

## Authors ##

* [Brian Cardarella](http://twitter.com/bcardarella)

[We are very thankful for the many contributors](https://github.com/dockyard/qunit-notifications/graphs/contributors)

## Versioning ##

This library follows [Semantic Versioning](http://semver.org)

## Want to help? ##

Please do! We are always looking to improve this gem. Please see our
[Contribution Guidelines](https://github.com/dockyard/qunit-notifications/blob/master/CONTRIBUTING.md)
on how to properly submit issues and pull requests.

## Legal ##

[DockYard](http://dockyard.com), Inc &copy; 2014

[@dockyard](http://twitter.com/dockyard)

[Licensed under the MIT license](http://www.opensource.org/licenses/mit-license.php)
