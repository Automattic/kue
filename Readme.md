
# Kue

  Kue is a priority job queue backed by [redis](http://redis.io), built for [node.js](http://nodejs.org).

## Installation

 Requires redis >= 2.1.0 for __WATCH__.

    $ npm install kue

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

### Delayed Jobs

  Sometimes you want to delay jobs to be executed after a certain timespan. `create()` supports a third parameter with a timestamp when the
  job should be executed. This is the minimum point of time and may vary depending on your job queue. If the job has a delay and high priority, the job
  is very likely to run on near the specified point in time. This example starts the email job, 30 seconds in future.

```js
jobs.create('email', {
    title: 'welcome email for tj'
  , to: 'tj@learnboost.com'
  , template: 'welcome-email'
}, new Date().getTime() + 30000).priority('high').save();
```

  This requires that the `jobs.promote([timestamp])` function is regulary executed on at least one node. One easy way is to use your master process and
  schedule a regular call:

```js
setInterval(jobs.promote, 2000);
```

  The promote function moves all jobs that are realy for running into the queue. From their they will take a normal path. Please consider that the promote
  intervall is setting additional delay on the specified point in time.

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

## Processing Jobs

 Processing jobs is simple with Kue. First create a `Queue` instance much like we do for creating jobs, providing us access to redis etc, then invoke `jobs.process()` with the associated type.

 In the following example we pass the callback `done` to `email`, if this function responds with an error it will be displayed in the UI and the job will be marked as a failure.

```js
var kue = require('kue')
 , jobs = kue.createQueue();

jobs.process('email', function(job, done){
  email(job.to, done);
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

  We can access this same arbitrary data within a separate process while processing, via the `job.data` property. In the example we render each slide one-by-one, updating the job's log and process. When an error occurs we invoke `done(err)` to tell Kue something happened, otherwise we invoke `done()` only when the job is complete.

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

### GET /stats

  Currently responds with state counts:

```js
{"inactiveCount":4,"completeCount":69,"activeCount":2,"failedCount":0}
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

  Get jobs with the specified range `:from` to `:to`, for
  example "/jobs/0..2", where `:order` may be "asc" or "desc":

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

## Parallel Processing With Cluster

 The example below shows how you may use [Cluster](http://learnboost.github.com/cluster) to spread the job processing load across CPUs. By default cluster will create one worker per CPU, however you can specify this number via `.set('workers', N)`.
 
 When cluster `.isMaster` the file is being executed in context of the master process, in which case you may perform tasks that you only want once, such as starting the web app bundled with Kue. The logic in the `else` block is executed _per worker_. 

```js
var kue = require('kue')
  , cluster = require('cluster')
  , jobs = kue.createQueue();

cluster = cluster()
  .set('workers', 8)
  .use(cluster.debug())
  .start();

if (cluster.isMaster) {
  kue.app.listen(3000);
} else {
  jobs.process('email', function(job, done){
    var pending = 5
      , total = pending;

    setInterval(function(){
      job.log('sending!');
      job.progress(total - pending, total);
      --pending || done();
    }, 1000);
  });
}
```

running this example you'll see the following output:

    $ node kue-example
    info - master started
    info - worker 0 spawned
    info - worker 1 spawned
    info - worker 2 spawned
    info - listening for connections
    info - worker 2 connected
    info - worker 1 connected
    info - worker 0 connected

now when you visit Kue's UI in the browser you'll see that jobs are being processed roughly 8 times faster! (if you have 8 cores).

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
