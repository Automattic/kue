# Kue

[![Build Status](https://travis-ci.org/LearnBoost/kue.svg?branch=master)](https://travis-ci.org/LearnBoost/kue.svg?branch=master&style=flat)
[![Dependency Status](https://img.shields.io/david/learnboost/kue.svg?style=flat)](https://david-dm.org/learnboost/kue)
[![npm version](https://badge.fury.io/js/kue.svg?style=flat)](http://badge.fury.io/js/kue)
[![Stories in Ready](https://badge.waffle.io/learnboost/kue.svg?style=flat&label=ready&title=Ready)](https://waffle.io/learnboost/kue)

Kue is a priority job queue backed by [redis](http://redis.io), built for [node.js](http://nodejs.org).

**PROTIP** This is the latest Kue documentation, make sure to also read the [changelist](History.md).

## Installation

    $ npm install kue

[![NPM](https://nodei.co/npm/kue.png?downloads=true&stars=true)](https://nodei.co/npm/kue/)

## Features

  - Delayed jobs
  - Distribution of parallel work load
  - Job event and progress pubsub
  - Rich integrated UI
  - Infinite scrolling
  - UI progress indication
  - Job specific logging
  - Powered by Redis
  - Optional retries with backoff
  - Full-text search capabilities
  - RESTful JSON API
  - Graceful workers shutdown

## Overview

  - [Creating Jobs](#creating-jobs)
  - [Jobs Priority](#job-priority)
  - [Failure Attempts](#failure-attempts)
  - [Failure Backoff](#failure-backoff)
  - [Job Logs](#job-logs)
  - [Job Progress](#job-progress)
  - [Job Events](#job-events)
  - [Queue Events](#queue-events)
  - [Delayed Jobs](#delayed-jobs)
  - [Processing Jobs](#processing-jobs)
  - [Processing Concurrency](#processing-concurrency)
  - [Pause Processing](#pause-processing)
  - [Updating Progress](#updating-progress)
  - [Graceful Shutdown](#graceful-shutdown)
  - [Error Handling](#error-handling)
  - [Queue Maintenance](#queue-maintenance)
  - [Redis Connection Settings](#redis-connection-settings)
  - [User-Interface](#user-interface)
  - [JSON API](#json-api)
  - [Parallel Processing With Cluster](#parallel-processing-with-cluster)
  - [Securing Kue](#securing-kue)
  - [Screencasts](#screencasts)
  - [License](#license)



## Creating Jobs

First create a job `Queue` with `kue.createQueue()`:

```js
var kue = require('kue')
  , queue = kue.createQueue();
```

Calling `queue.create()` with the type of job ("email"), and arbitrary job data will return a `Job`, which can then be `save()`ed, adding it to redis, with a default priority level of "normal". The `save()` method optionally accepts a callback, responding with an `error` if something goes wrong. The `title` key is special-cased, and will display in the job listings within the UI, making it easier to find a specific job.

```js
var job = queue.create('email', {
    title: 'welcome email for tj'
  , to: 'tj@learnboost.com'
  , template: 'welcome-email'
}).save( function(err){
   if( !err ) console.log( job.id );
});
```

### Job Priority

To specify the priority of a job, simply invoke the `priority()` method with a number, or priority name, which is mapped to a number.

```js
queue.create('email', {
    title: 'welcome email for tj'
  , to: 'tj@learnboost.com'
  , template: 'welcome-email'
}).priority('high').save();
```

The default priority map is as follows:

```js
{
    low: 10
  , normal: 0
  , medium: -5
  , high: -10
  , critical: -15
};
```

### Failure Attempts

By default jobs only have _one_ attempt, that is when they fail, they are marked as a failure, and remain that way until you intervene. However, Kue allows you to specify this, which is important for jobs such as transferring an email, which upon failure, may usually retry without issue. To do this invoke the `.attempts()` method with a number.

```js
 queue.create('email', {
     title: 'welcome email for tj'
   , to: 'tj@learnboost.com'
   , template: 'welcome-email'
 }).priority('high').attempts(5).save();
```

### Failure Backoff
Job retry attempts are done as soon as they fail, with no delay, even if your job had a delay set via `Job#delay`. If you want to delay job re-attempts upon failures (known as backoff) you can use `Job#backoff` method in different ways:

```js
    // Honor job's original delay (if set) at each attempt, defaults to fixed backoff
    job.attempts(3).backoff( true )

    // Override delay value, fixed backoff
    job.attempts(3).backoff( {delay: 60*1000, type:'fixed'} )

    // Enable exponential backoff using original delay (if set)
    job.attempts(3).backoff( {type:'exponential'} )

    // Use a function to get a customized next attempt delay value
    job.attempts(3).backoff( function( attempts, delay ){
      return my_customized_calculated_delay;
    })
```

In the last scenario, provided function will be executed (via eval) on each re-attempt to get next attempt delay value, meaning that you can't reference external/context variables within it.

**Note** that backoff feature depends on `.delay` under the covers and therefore `.promote()` needs to be called if used.

### Job Logs

Job-specific logs enable you to expose information to the UI at any point in the job's life-time. To do so simply invoke `job.log()`, which accepts a message string as well as variable-arguments for sprintf-like support:

```js 
job.log('$%d sent to %s', amount, user.name);
``` 

### Job Progress

Job progress is extremely useful for long-running jobs such as video conversion. To update the job's progress simply invoke `job.progress(completed, total [, data])`:

```js
job.progress(frames, totalFrames);
```

data can be used to pass extra information about the job. For example a message or an object with some extra contextual data to the current status.

### Job Events

Job-specific events are fired on the `Job` instances via Redis pubsub. The following events are currently supported:

    - `enqueue` the job is now queued
    - `promotion` the job is promoted from delayed state to queued
    - `progress` the job's progress ranging from 0-100
    - 'failed attempt' the job has failed, but has remaining attempts yet
    - `failed` the job has failed and has no remaining attempts
    - `complete` the job has completed


For example this may look something like the following:

```js
var job = queue.create('video conversion', {
    title: 'converting loki\'s to avi'
  , user: 1
  , frames: 200
});

job.on('complete', function(result){
  console.log('Job completed with data ', result);

}).on('failed attempt', function(errorMessage, doneAttempts){
  console.log('Job failed');

}).on('failed', function(errorMessage){
  console.log('Job failed');

}).on('progress', function(progress, data){
  console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data );

});
```

**Note** that Job level events are not guaranteed to be received upon process restarts, since restarted node.js process will lose the reference to the specific Job object. If you want a more reliable event handler look for [Queue Events](#queue-events).

### Queue Events

Queue-level events provide access to the job-level events previously mentioned, however scoped to the `Queue` instance to apply logic at a "global" level. An example of this is removing completed jobs:
 
```js
queue.on('job enqueue', function(id, type){
  console.log( 'Job %s got queued of type %s', id, type );

}).on('job complete', function(id, result){
  kue.Job.get(id, function(err, job){
    if (err) return;
    job.remove(function(err){
      if (err) throw err;
      console.log('removed completed job #%d', job.id);
    });
  });
});
```

The events available are the same as mentioned in "Job Events", however prefixed with "job ". 

### Delayed Jobs

Delayed jobs may be scheduled to be queued for an arbitrary distance in time by invoking the `.delay(ms)` method, passing the number of milliseconds relative to _now_. Alternatively, you can pass a JavaScript `Date` object with a specific time in the future.
This automatically flags the `Job` as "delayed". 

```js
var email = queue.create('email', {
    title: 'Account renewal required'
  , to: 'tj@learnboost.com'
  , template: 'renewal-email'
}).delay(milliseconds)
  .priority('high')
  .save();
```

When using delayed jobs, we must also check the delayed jobs with a timer, promoting them if the scheduled delay has been exceeded. This `setInterval` is defined within `Queue#promote(ms,limit)`, defaulting to a check of top 200 jobs every 5 seconds. If you have a cluster of kue processes, you must call `.promote` in just one (preferably master) process or promotion race can happen.

```js
queue.promote();
```

## Processing Jobs

Processing jobs is simple with Kue. First create a `Queue` instance much like we do for creating jobs, providing us access to redis etc, then invoke `queue.process()` with the associated type.
Note that unlike what the name `createQueue` suggests, it currently returns a singleton `Queue` instance. So you can configure and use only a single `Queue` object within your node.js process.

In the following example we pass the callback `done` to `email`, When an error occurs we invoke `done(err)` to tell Kue something happened, otherwise we invoke `done()` only when the job is complete. If this function responds with an error it will be displayed in the UI and the job will be marked as a failure. The error object passed to done, should be of standard type `Error`.

```js
var kue = require('kue')
 , queue = kue.createQueue();

queue.process('email', function(job, done){
  email(job.data.to, done);
});

function email(address, done) {
  if(!isValidEmail(address)) {
    //done('invalid to address') is possible but discouraged
    return done(new Error('invalid to address'));
  }
  // email send stuff...
  done();
}
```

Workers can also pass job result as the second parameter to done `done(null,result)` to store that in `Job.result` key. `result` is also passed through `complete` event handlers so that job producers can receive it if they like to.

### Processing Concurrency

By default a call to `queue.process()` will only accept one job at a time for processing. For small tasks like sending emails this is not ideal, so we may specify the maximum active jobs for this type by passing a number:
 
```js
queue.process('email', 20, function(job, done){
  // ...
});
```

### Pause Processing

Workers can temporary pause and resume their activity. It is, after calling `pause` they will receive no jobs in their process callback until `resume` is called. `pause` function gracefully shutdowns this worker, and uses the same internal functionality as `shutdown` method in [Graceful Shutdown](#graceful-shutdown).

```js
queue.process('email', function(job, done, ctx){
  ctx.pause( function(err){
    console.log("Worker is paused... ");
    setTimeout( function(){ ctx.resume(); }, 10000 );
  }, 5000);
});
```

### Updating Progress

For a "real" example, let's say we need to compile a PDF from numerous slides with [node-canvas](http://github.com/learnboost/node-canvas). Our job may consist of the following data, note that in general you should _not_ store large data in the job it-self, it's better to store references like ids, pulling them in while processing.
 
```js
queue.create('slideshow pdf', {
    title: user.name + "'s slideshow"
  , slides: [...] // keys to data stored in redis, mongodb, or some other store
});
```

We can access this same arbitrary data within a separate process while processing, via the `job.data` property. In the example we render each slide one-by-one, updating the job's log and process.

```js
queue.process('slideshow pdf', 5, function(job, done){
  var slides = job.data.slides
    , len = slides.length;

  function next(i) {
    var slide = slides[i]; // pretend we did a query on this slide id ;)
    job.log('rendering %dx%d slide', slide.width, slide.height);
    renderSlide(slide, function(err){
      if (err) return done(err);
      job.progress(i, len, {nextSlide : i == len ? 'itsdone' : i + 1});
      if (i == len) done()
      else next(i + 1);
    });
  }

  next(0);
});
```

### Graceful Shutdown

As of Kue 0.7.0, a `Queue#shutdown(fn, timeout)` is added which signals all workers to stop processing after their current active job is done. Workers will wait `timeout` milliseconds for their active job's done to be called or mark the active job `failed` with shutdown error reason. When all workers tell Kue they are stopped `fn` is called.

```javascript
var queue = require('kue').createQueue();

process.once( 'SIGTERM', function ( sig ) {
  queue.shutdown(function(err) {
    console.log( 'Kue is shut down.', err||'' );
    process.exit( 0 );
  }, 5000 );
});
```

## Error Handling

All errors either in Redis client library or Queue are emitted to the `Queue` object. You should bind to `error` events to prevent uncaught exceptions or debug kue errors.

```javascript
var queue = require('kue').createQueue();

queue.on( 'error', function( err ) {
  console.log( 'Oops... ', err );
});
```

### Prevent from Stuck Active Jobs

Kue marks a job complete/failed when `done` is called by your worker, so you should use proper error handling to prevent uncaught exceptions in your worker's code and node.js process exiting before in handle jobs get done.
This can be achieved in two ways:

1. Wrapping your worker's process function in [Domains](https://nodejs.org/api/domain.html)

  ```js
  queue.process('my-error-prone-task', function(job, done){
    var domain = require('domain').create();
    domain.on('error', function(err){
      done(err);
    });
    domain.run(function(){ // your process function
      throw new Error( 'bad things happen' );
      done();
    });
  });
  ```

  This is the softest and best solution, however is not built-in with Kue. Please refer to [this discussion](https://github.com/kriskowal/q/issues/120). You can comment on this feature in the related open Kue [issue](https://github.com/LearnBoost/kue/pull/403).

  You can also use promises to do something like

  ```js
  queue.process('my-error-prone-task', function(job, done){
    Promise.method( function(){ // your process function
      throw new Error( 'bad things happen' );
    })().nodeify(done)
  });
  ```

  but this won't catch exceptions in your async call stack as domains do.



2. Binding to `uncaughtException` and gracefully shutting down the Kue.

  ```js
  process.once( 'uncaughtException', function(err){
    queue.shutdown(function(err2){
      process.exit( 0 );
    }, 2000 );
  });
  ```

### Unstable Redis connections

Kue currently uses client side job state management and when redis crashes in the middle of that operations, some stuck jobs or index inconsistencies will happen. If you are facing poor redis connections or an unstable redis service you can start Kue's watchdog to fix stuck inactive jobs (if any) by calling:

```js
queue.watchStuckJobs()
```

Kue will be refactored to fully atomic job state management from version 1.0 and this will happen by lua scripts and/or BRPOPLPUSH combination. You can read more [here](https://github.com/LearnBoost/kue/issues/130) and [here](https://github.com/LearnBoost/kue/issues/38).

## Queue Maintenance

### Programmatic Job Management

If you did none of above or your process lost active jobs in any way, you can recover from them when your process is restarted. A blind logic would be to re-queue all stuck jobs:

```js
queue.active( function( err, ids ) {
  ids.forEach( function( id ) {
    kue.Job.get( id, function( err, job ) {
      // if job is a stuck one
      job.inactive();
    });
  });
});
```

**Note** *in a clustered deployment your application should be aware not to involve a job that is valid, currently inprocess by other workers.*

### Job Cleanup

Jobs data and search indexes eat up redis memory space, so you will need some job-keeping process in real world deployments. Your first chance is using automatic job removal on completion.

```javascript
queue.create( ... ).removeOnComplete( true ).save()
```

But if you eventually/temporally need completed job data, you can setup an on-demand job removal script like below to remove top `n` completed jobs:

```js
kue.Job.rangeByState( 'complete', 0, n, 'asc', function( err, jobs ) {
  jobs.forEach( function( job ) {
    job.remove( function(){
      console.log( 'removed ', job.id );
    });
  }
});
```

**Note** *that you should provide enough time for `.remove` calls on each job object to complete before your process exits, or job indexes will leak*


## Redis Connection Settings

By default, Kue will connect to Redis using the client default settings (port defaults to `6379`, host defaults to `127.0.0.1`, prefix defaults to `q`). `Queue#createQueue(options)` accepts redis connection options in `options.redis` key.

```javascript
var kue = require('kue');
var q = kue.createQueue({
  prefix: 'q',
  redis: {
    port: 1234,
    host: '10.0.50.20',
    auth: 'password',
    db: 3, // if provided select a non-default redis db
    options: {
      // see https://github.com/mranney/node_redis#rediscreateclient
    }
  }
});
```

`prefix` controls the key names used in Redis.  By default, this is simply `q`. Prefix generally shouldn't be changed unless you need to use one Redis instance for multiple apps. It can also be useful for providing an isolated testbed across your main application.

You can also specify the connection information as a URL string.

```js
var q = kue.createQueue({
  redis: 'redis://example.com:1234?redis_option=value&redis_option=value'
});
```

#### Connecting using Unix Domain Sockets

Since [node_redis](https://github.com/mranney/node_redis) supports Unix Domain Sockets, you can also tell Kue to do so. See [unix-domain-socket](https://github.com/mranney/node_redis#unix-domain-socket) for your redis server configuration.

```javascript
var kue = require('kue');
var q = kue.createQueue({
  prefix: 'q',
  redis: {
    socket: '/data/sockets/redis.sock',
    auth: 'password',
    options: {
      // see https://github.com/mranney/node_redis#rediscreateclientport-host-options
    }
  }
});
```

#### Replacing Redis Client Module

Any node.js redis client library that conforms (or when adapted) to  [node_redis](https://github.com/mranney/node_redis) API can be injected into Kue. You should only provide a `createClientFactory` function as a redis connection factory instead of providing node_redis connection options.

Below is a sample code to enable [redis-sentinel](https://github.com/ortoo/node-redis-sentinel) to connect to [Redis Sentinel](http://redis.io/topics/sentinel) for automatic master/slave failover.

```javascript
var kue = require('kue');
var Sentinel = require('redis-sentinel');
var endpoints = [
  {host: '192.168.1.10', port: 6379},
  {host: '192.168.1.11', port: 6379}
];
var opts = options || {}; // Standard node_redis client options
var masterName = 'mymaster';
var sentinel = Sentinel.Sentinel(endpoints);

var q = kue.createQueue({
   redis: {
      createClientFactory: function(){
         return sentinel.createClient(masterName, opts);
      }
   }
});
```

**Note** *that all `<0.8.x` client codes should be refactored to pass redis options to `Queue#createQueue` instead of monkey patched style overriding of `redis#createClient` or they will be broken from Kue `0.8.x`.*


## User-Interface

The UI is a small [Express](http://github.com/visionmedia/express) application, to fire it up simply run the following, altering the port etc as desired.

```js
var kue = require('kue');
kue.createQueue(...);
kue.app.listen(3000);
```

The title defaults to "Kue", to alter this invoke:

```js
kue.app.set('title', 'My Application');
```

**Note** *that if you are using non-default Kue options, `kue.createQueue(...)` must be called before accessing `kue.app`.*

### Third-party interfaces

You can also use [Kue-UI](https://github.com/StreetHub/kue-ui) web interface contributed by [Arnaud Bénard](https://github.com/arnaudbenard)


## JSON API

Along with the UI Kue also exposes a JSON API, which is utilized by the UI.

### GET /job/search?q=

Query jobs, for example "GET /job/search?q=avi video":

```js
["5", "7", "10"]
```

By default kue indexes the whole Job data object for searching, but this can be customized via calling `Job#searchKeys` to tell kue which keys on Job data to create index for:

```javascript
var kue = require('kue');
queue = kue.createQueue();
queue.create('email', {
    title: 'welcome email for tj'
  , to: 'tj@learnboost.com'
  , template: 'welcome-email'
}).searchKeys( ['to', 'title'] ).save();
```

You may also fully disable search indexes for redis memory optimization:

```javascript
var kue = require('kue');
q = kue.createQueue({
    disableSearch: true
});
```

### GET /stats

Currently responds with state counts, and worker activity time in milliseconds:

```js
{"inactiveCount":4,"completeCount":69,"activeCount":2,"failedCount":0,"workTime":20892}
```

### GET /job/:id

Get a job by `:id`:

```js
{"id":"3","type":"email","data":{"title":"welcome email for tj","to":"tj@learnboost.com","template":"welcome-email"},"priority":-10,"progress":"100","state":"complete","attempts":null,"created_at":"1309973155248","updated_at":"1309973155248","duration":"15002"}
```

### GET /job/:id/log

Get job `:id`'s log:
  
```js
['foo', 'bar', 'baz']
```

### GET /jobs/:from..:to/:order?

Get jobs with the specified range `:from` to `:to`, for example "/jobs/0..2", where `:order` may be "asc" or "desc":

```js
[{"id":"12","type":"email","data":{"title":"welcome email for tj","to":"tj@learnboost.com","template":"welcome-email"},"priority":-10,"progress":0,"state":"active","attempts":null,"created_at":"1309973299293","updated_at":"1309973299293"},{"id":"130","type":"email","data":{"title":"welcome email for tj","to":"tj@learnboost.com","template":"welcome-email"},"priority":-10,"progress":0,"state":"active","attempts":null,"created_at":"1309975157291","updated_at":"1309975157291"}]
```

### GET /jobs/:state/:from..:to/:order?

Same as above, restricting by `:state` which is one of:
  
    - active
    - inactive
    - failed
    - complete

### GET /jobs/:type/:state/:from..:to/:order?

Same as above, however restricted to `:type` and `:state`.

### DELETE /job/:id

Delete job `:id`:
  
    $ curl -X DELETE http://local:3000/job/2
    {"message":"job 2 removed"}

### POST /job

Create a job:

    $ curl -H "Content-Type: application/json" -X POST -d \
        '{
           "type": "email",
           "data": {
             "title": "welcome email for tj",
             "to": "tj@learnboost.com",
             "template": "welcome-email"
           },
           "options" : {
             "attempts": 5,
             "priority": "high"
           }
         }' http://localhost:3000/job
    {"message": "job created", "id": 3}

You can create multiple jobs at once by passing an array. In this case, the response will be an array too.

    $ curl -H "Content-Type: application/json" -X POST -d \
        '[{
           "type": "email",
           "data": {
             "title": "welcome email for tj",
             "to": "tj@learnboost.com",
             "template": "welcome-email"
           },
           "options" : {
             "attempts": 5,
             "priority": "high"
           }
         },
         {
           "type": "email",
           "data": {
             "title": "followup email for tj",
             "to": "tj@learnboost.com",
             "template": "followup-email",
             "delay": 86400
           },
           "options" : {
             "attempts": 5,
             "priority": "high"
           }
         }]' http://localhost:3000/job
    [
	    {"message": "job created", "id": 4},
	    {"message": "job created", "id": 5}
    ]

Note: when inserting multiple jobs in bulk, if one insertion fails Kue will not attempt adding the remaining jobs. The response array will contain the ids of the jobs added successfully, and the last element will be an object describing the error: `{"error": "error reason"}`. It is your responsibility to fix the wrong task and re-submit it and all the subsequent ones.


## Parallel Processing With Cluster

The example below shows how you may use [Cluster](http://nodejs.org/api/cluster.html) to spread the job processing load across CPUs. Please see [Cluster module's documentation](http://nodejs.org/api/cluster.html) for more detailed examples on using it.
 
When cluster `.isMaster` the file is being executed in context of the master process, in which case you may perform tasks that you only want once, such as starting the web app bundled with Kue. The logic in the `else` block is executed _per worker_. 

```js
var kue = require('kue')
  , cluster = require('cluster')
  , queue = kue.createQueue();

var clusterWorkerSize = require('os').cpus().length;

if (cluster.isMaster) {
  kue.app.listen(3000);
  for (var i = 0; i < clusterWorkerSize; i++) {
    cluster.fork();
  }
} else {
  queue.process('email', 10, function(job, done){
    var pending = 5
      , total = pending;

    var interval = setInterval(function(){
      job.log('sending!');
      job.progress(total - pending, total);
      --pending || done();
      pending || clearInterval(interval);
    }, 1000);
  });
}
```

This will create an `email` job processor (worker) per each of your machine CPU cores, with each you can handle 10 concurrent email jobs, leading to total `10 * N` concurrent email jobs processed in your `N` core machine.

Now when you visit Kue's UI in the browser you'll see that jobs are being processed roughly `N` times faster! (if you have `N` cores).

## Securing Kue

Through the use of app mounting you may customize the web application, enabling TLS, or adding additional middleware like Connect's `basicAuth()`.

```js
var app = express.createServer({ ... tls options ... });
app.use(express.basicAuth('foo', 'bar'));
app.use(kue.app);
app.listen(3000);
```

## Screencasts

  - [Introduction](http://www.screenr.com/oyNs) to Kue
  - API [walkthrough](http://vimeo.com/26963384) to Kue

## License 

(The MIT License)

Copyright (c) 2011 LearnBoost &lt;tj@learnboost.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
