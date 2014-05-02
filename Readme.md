# Kue [![Build Status](https://travis-ci.org/LearnBoost/kue.png)](https://travis-ci.org/LearnBoost/kue)

Kue is a priority job queue backed by [redis](http://redis.io), built for [node.js](http://nodejs.org).

## Installation

    $ npm install kue

[![NPM](https://nodei.co/npm/kue.png?downloads=true&stars=true)](https://nodei.co/npm/kue/)

## Features

  - Delayed jobs
  - Job event and progress pubsub
  - Rich integrated UI
  - Infinite scrolling
  - UI progress indication
  - Job specific logging
  - Powered by Redis
  - Optional retries
  - Full-text search capabilities
  - RESTful JSON API
  - Graceful workers shutdown

## Overview

  - [Creating Jobs](#creating-jobs)
  - [Jobs Priority](#job-priority)
  - [Failure Attempts](#failure-attempts)
  - [Job Logs](#job-logs)
  - [Job Progress](#job-progress)
  - [Job Events](#job-events)
  - [Queue Events](#queue-events)
  - [Delayed Jobs](#delayed-jobs)
  - [Processing Jobs](#processing-jobs)
  - [Processing Concurrency](#processing-concurrency)
  - [Updating Progress](#updating-progress)
  - [Graceful Shutdown](#graceful-shutdown)
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
  , jobs = kue.createQueue();
```

Calling `jobs.create()` with the type of job ("email"), and arbitrary job data will return a `Job`, which can then be `save()`ed, adding it to redis, with a default priority level of "normal". The `save()` method optionally accepts a callback, responding with an `error` if something goes wrong. The `title` key is special-cased, and will display in the job listings within the UI, making it easier to find a specific job.

```js
jobs.create('email', {
    title: 'welcome email for tj'
  , to: 'tj@learnboost.com'
  , template: 'welcome-email'
}).save();
```

### Job Priority

To specify the priority of a job, simply invoke the `priority()` method with a number, or priority name, which is mapped to a number.

```js
jobs.create('email', {
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
 jobs.create('email', {
     title: 'welcome email for tj'
   , to: 'tj@learnboost.com'
   , template: 'welcome-email'
 }).priority('high').attempts(5).save();
```

### Job Logs

Job-specific logs enable you to expose information to the UI at any point in the job's life-time. To do so simply invoke `job.log()`, which accepts a message string as well as variable-arguments for sprintf-like support:

```js 
job.log('$%d sent to %s', amount, user.name);
``` 

### Job Progress

Job progress is extremely useful for long-running jobs such as video conversion. To update the job's progress simply invoke `job.progress(completed, total)`:

```js
job.progress(frames, totalFrames);
```

### Job Events

Job-specific events are fired on the `Job` instances via Redis pubsub. The following events are currently supported:

    - `failed` the job has failed and has no remaining attempts
    - 'failed attempt' the job has failed, but has remaining attempts yet
    - `complete` the job has completed
    - `promotion` the job (when delayed) is now queued
    - `progress` the job's progress ranging from 0-100

For example this may look something like the following:

```js
var job = jobs.create('video conversion', {
    title: 'converting loki\'s to avi'
  , user: 1
  , frames: 200
});

job.on('complete', function(){
  console.log("Job complete");
}).on('failed', function(){
  console.log("Job failed");
}).on('progress', function(progress){
  process.stdout.write('\r  job #' + job.id + ' ' + progress + '% complete');
});
```

### Queue Events

Queue-level events provide access to the job-level events previously mentioned, however scoped to the `Queue` instance to apply logic at a "global" level. An example of this is removing completed jobs:
 
```js
jobs.on('job complete', function(id){
  Job.get(id, function(err, job){
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

Delayed jobs may be scheduled to be queued for an arbitrary distance in time by invoking the `.delay(ms)` method, passing the number of milliseconds relative to _now_. This automatically flags the `Job` as "delayed". 

```js
var email = jobs.create('email', {
    title: 'Account renewal required'
  , to: 'tj@learnboost.com'
  , template: 'renewal-email'
}).delay(milliseconds)
  .priority('high')
  .save();
```

When using delayed jobs, we must also check the delayed jobs with a timer, promoting them if the scheduled delay has been exceeded. This `setInterval` is defined within `Queue#promote(ms,limit)`, defaulting to a check of top 200 jobs every 5 seconds.

```js
jobs.promote();
```

## Processing Jobs

Processing jobs is simple with Kue. First create a `Queue` instance much like we do for creating jobs, providing us access to redis etc, then invoke `jobs.process()` with the associated type.
Note that unlike what the name `createQueue` suggests, it currently returns a singleton `Queue` instance. [Support for named queues are also requested](https://github.com/LearnBoost/kue/pull/274)

In the following example we pass the callback `done` to `email`, When an error occurs we invoke `done(err)` to tell Kue something happened, otherwise we invoke `done()` only when the job is complete. If this function responds with an error it will be displayed in the UI and the job will be marked as a failure.

```js
var kue = require('kue')
 , jobs = kue.createQueue();

jobs.process('email', function(job, done){
  email(job.data.to, done);
});
```

### Processing Concurrency

By default a call to `jobs.process()` will only accept one job at a time for processing. For small tasks like sending emails this is not ideal, so we may specify the maximum active jobs for this type by passing a number:
 
```js
jobs.process('email', 20, function(job, done){
  // ...
});
```

### Updating Progress

For a "real" example, let's say we need to compile a PDF from numerous slides with [node-canvas](http://github.com/learnboost/node-canvas). Our job may consist of the following data, note that in general you should _not_ store large data in the job it-self, it's better to store references like ids, pulling them in while processing.
 
```js
jobs.create('slideshow pdf', {
    title: user.name + "'s slideshow"
  , slides: [...] // keys to data stored in redis, mongodb, or some other store
});
```

We can access this same arbitrary data within a separate process while processing, via the `job.data` property. In the example we render each slide one-by-one, updating the job's log and process.

```js
jobs.process('slideshow pdf', 5, function(job, done){
  var slides = job.data.slides
    , len = slides.length;

  function next(i) {
    var slide = slides[i]; // pretend we did a query on this slide id ;)
    job.log('rendering %dx%d slide', slide.width, slide.height);
    renderSlide(slide, function(err){
      if (err) return done(err);
      job.progress(i, len);
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

## Redis Connection Settings

By default, Kue will connect to Redis using the client default settings (port defaults to `6379`, host defaults to `127.0.0.1`, prefix defaults to `q`). `Queue#createQueue(options)` accepts redis connection options in `options.redis` key.

```javascript
var kue = require('kue');
q = kue.createQueue({
  prefix: 'q',
  redis: {
    port: 1234,
    host: '10.0.50.20',
    auth: 'password',
    options: {
      // look for more redis options in [node_redis](https://github.com/mranney/node_redis)
    }
  }
});
```

`prefix` controls the key names used in Redis.  By default, this is simply
`q`.  Prefix generally shouldn't be changed unless you need to use one Redis
instance for multiple apps.  It can also be useful for testing your application
- for example, using a different prefix for each set of tests to ensure that
  previous runs don't accidentally pollute current runs.

For backward compatibility to `Kue < 0.7.0`, monkey-patch-styled Redis client connection settings can be set by overriding the `kue.redis.createClient` function.

For example, to create a Redis client that connects to `192.168.1.2` on port `1234` that requires authentication, use the following:

```javascript
var kue = require('kue')
  , redis = require('redis');

kue.redis.createClient = function() {
  var client = redis.createClient(1234, '192.168.1.2');
  client.auth('password');
  return client;
};
```

Redis connection settings must be set before calling `kue.createQueue()` or accessing `kue.app`.



## User-Interface

The UI is a small [Express](http://github.com/visionmedia/express) application, to fire it up simply run the following, altering the port etc as desired.

```js
var kue = require('kue');
kue.app.listen(3000);
```

The title defaults to "Kue", to alter this invoke:

```js
kue.app.set('title', 'My Application');
```

## JSON API

Along with the UI Kue also exposes a JSON API, which is utilized by the UI.

### GET /job/search?q=

Query jobs, for example "GET /job/search?q=avi video":

```js
["5", "7", "10"]
```

You may disable search indexes in Kue >= 0.7.0 for memory optimization or to avoid [memory leaks](https://github.com/LearnBoost/kue/search?q=leak&type=Issues) that some have reported:

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
    {"message":"job 3 created"}


## Parallel Processing With Cluster

The example below shows how you may use [Cluster](http://nodejs.org/api/cluster.html) to spread the job processing load across CPUs. Please see [Cluster module's documentation](http://nodejs.org/api/cluster.html) for more detailed examples on using it.
 
When cluster `.isMaster` the file is being executed in context of the master process, in which case you may perform tasks that you only want once, such as starting the web app bundled with Kue. The logic in the `else` block is executed _per worker_. 

```js
var kue = require('kue')
  , cluster = require('cluster')
  , jobs = kue.createQueue();

var clusterWorkerSize = require('os').cpus().length;

if (cluster.isMaster) {
  kue.app.listen(3000);
  for (var i = 0; i < clusterWorkerSize; i++) {
    cluster.fork();
  }
} else {
  jobs.process('email', 10, function(job, done){
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
