
var kue = require('../')
  , jobs = kue.createQueue();

// function email() {
//   console.log('email queued');
//   jobs.create('email', {
//       title: 'welcome email for tj'
//     , to: 'tj@learnboost.com'
//     , template: 'welcome-email'
//   }).priority('high').save();
// }
// 
// setInterval(email, 3000);

// jobs.create('video conversion', {
//     title: 'converting foo.webm to 2 formats'
//   , path: '/path/to/foo.webm'
//   , formats: ['avi', 'mov']
// }).priority('high').save();

// setInterval(function(){
  console.log('job');
  jobs.create('email', {
      title: 'welcome email for tj'
    , to: 'tobi@learnboost.com'
    , template: 'welcome-email'
  }).priority('critical')
    .save();
// }, 1000);

// jane
// loki
// tobi
