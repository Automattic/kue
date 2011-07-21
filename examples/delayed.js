
var kue = require('../');

// create our job queue

var jobs = kue.createQueue();

// one minute

var minute = 60000;

jobs.create('email', {
    title: 'Account renewal required'
  , to: 'tj@learnboost.com'
  , template: 'renewal-email'
}).delay(minute)
  .priority('high')
  .save();

// start the UI
kue.app.listen(3000);
console.log('UI started on port 3000');