0.11.1 / 2016-06-15
===================

* Upgrade redis to 2.6
* Add switch for each job event


0.11.0 / 2016-05-13
===================

* force node_redis version to 2.4.x, Closes #857
* Converting Job ids back into integers, #855
* Fix LPUSH crash during shutdown, #854
* Install kue-dashboard script, #853
* Add start event to documentation, #841
* Add parameter for testMode.enter to continue processing jobs, #821
* Modern Node.js versions support, #812
* Don't start the next job until the current one is totally finished, Closes #806
* Store multiple instances of jobs in jobs id map to emit events for all, #750 


0.10.6 / 2016-04-27
===================

* Redis Cluster fix, Closes #861


0.10.5 / 2016-01-14
===================

* Attempts surpassing max attempts on delay jobs upon failure, resulting in infinite retries, Fixes #797
* Add yargs dependency for kue-dashboard, #796


0.10.4 / 2016-01-14
===================

* fix zpop callback on shutdown
* fix connection_options in test.js
* Unit tests for redis.js #779
* Tests for kue.js #778


0.10.3 / 2015-11-20
===================

* Fixing Job processing order without munging the job id, Closes #708, Closes #678


0.10.2 / 2015-11-20
===================

* Add support for ioredis, Closes #652
* Add support for Redis Cluster, Closes #642
* Fix `this.state` on refreshTTL 


0.10.0 / 2015-11-20
===================

* Update TTL on job progress, Closes #694
* Upgrade to node_redis 2.3,  #717
* Fix LPUSH vs connection quit race when shutting down
* Restart task btn, #754
* Fix uncaught exception in job.js, #751
* Added kue-dashboard script for conveniently running the dashboard #611
* Fixed invalid CSS on production, #755
* Connection string not supporting DB number #725
* Fix attempts remaining logic, #742
* Update jade, #741
* Properly set job IDs in test mode, #727
* Enhanced Job.log formatting, #630
* Use node's util#format() in Job.log, #724


0.9.6 / 2015-10-06
===================

* Fix redirection issue


0.9.5 / 2015-09-16
===================

* When no ttl is set for jobs, don't let high priorities to conflict, fixes #697
* Fix redirection issue, closes #685
* Get progress_data along with other redis fields, PR #642
* Grab only password from Redis URL, fixes #681
* Add remove job event, PR #665


0.9.4 / 2015-07-17
===================

* Job that doesn't call done() retries twice, fixes #669


0.9.3 / 2015-05-07
===================

* Fix unlocking promotion lock, Closes #608


0.9.2 / 2015-05-07
===================

* Fix duplicate job promotion/ttl race, Closes #601


0.9.1 / 2015-05-05
===================

* Filter only jobs that have ttl set, Fixes #590


0.9.0 / 2015-05-02
===================

* Upgrade to express 4.x, Closes #537
* Move `job.reprocess` done callback to the last, Closes #387, Closes #385
* Standardize signature of `.shutdown()` callback, Closes #454
* Turn off search indexes by default, Closes #412
* Improve delayed job promotion feature, Closes #533, fixes #312, closes #352
* Use a distributed redis lock to hide job promotion from user, Closes #556
* Deprecate `.promote` and update documentation
* Document Javascript API to query queue state, Closes #455
* Add jobEvents flag to switch off job events for memory optimization, Closes #401
* Add idle event to capture unsuccessful zpop's in between of worker get Job, should fix #538
* Add TTL for active jobs, Closes #544
* Document `jobEvents` queue config, Closes #557
* Bulk job create API now processes all jobs in case of intermediate errors, Closes #552
* Merge `red job remove buttons and tooltips` PR, Closes #566
* Add a in-memory test Kue mode, Closes #561
* Update reds package to `0.2.5`
* Merge PR #594, bad redirect URL in old express versions, fixes #592
* update dependency to forked warlock repo to fix redis connection cleanup on shutdown, fixes #578
* Update job hash with the worker ID, Closes #580


0.8.12 / 2015-03-22
===================

* Bulk job create JSON API, Closes #334, Closes #500, Closes #527
* Add feature to specify redis connection string/url, Closes #540
* Mention kue-ui in readme, Closes #502
* Add an extra parameter to the progress method to notify extra contextual data, Closes #466, Closes #427, Closes #313
* Document job event callback arguments, Closes #542
* Fix typo in documentation, Closes #506
* Document importance of using Kue `error` listeners, Closes #409
* Document Queue maintenance and job.removeOnComplete( true ), Closes #439
* Document how to query all the active jobs programmatically, Closes #418
* Document to explain how "stuck queued jobs" happens, Closes #451
* Document on proper error handling to prevent stuck jobs, Closes #391


0.8.11 / 2014-12-15
===================

* Fix shutdown on re-attemptable jobs, Closes #469
* Fix race condition in delaying jobs when re-attempts, Closes #483
* Make `watchStuckJobs` aware of queue prefix, Closes #452
* Send along error message when emitting a failed event, Closes #461


0.8.10 / 2014-12-13
===================

* Add more tests, Closes #280
* More atomic job state changes, Closes #411
* Documentation: error passed to done should be string or standard JS error object, Closes #394
* Documentation: backoff documentation, Closes #435
* Documentation: correct `promote` usage, Closes #413
* Add job enqueue event, Closes #458
* Watch for errors with non-string err.stack, Closes #426
* Fix web app redirect path for express 4.0, Closes #393
* `removeBadJob` should do pessimistic job removal from all state ZSETs, Closes #438
* Add stats json api by type and state, Closes #477
* Don't let concurrent graceful shutdowns on subsequent`Queue#shutdown`calls, Closes #479
* Fix `cleanup` global leak, Closes #475


0.8.9 / 2014-10-01
==================

* Properly update status flags on resume, Closes #423

0.8.8 / 2014-09-12
==================

* Fix tests to limited shutdown timeouts
* Add a redis lua watchdog to fix stuck inactive jobs, fixes #130
* Stuck inactive jobs watchdog, Closes #130

0.8.7 / 2014-09-12
==================

* Shutdown timeout problems and races, fixes #406

0.8.6 / 2014-08-30
==================

* Quit redis connections on shutdown & let the process exit, closes #398

0.8.5 / 2014-08-10
==================

  * Fix typo in removeOnComplete
  
0.8.4 / 2014-08-08
==================

  * Emit event 'job failed attempt' after job successfully updated, closes #377
  * Fix delaying jobs when failed, closes #384
  * Implement `job.removeOnComplete`, closes #383
  * Make searchKeys chainable, closes #379
  * Add extra job options to JSON API, closes #378
  
0.8.3 / 2014-07-13
==================

  * Inject other Redis clients compatible with node_redis #344
  * Add support to connect to Redis using Linux sockets #362
  * Add .save callback sample code in documentation #367

0.8.2 / 2014-07-08
==================

  * Fix broken failure backoff #360
  * Merge web console redirection fix #357
  * Add db selection option to redis configuration #354
  * Get number of jobs with given state and type #349
  * Add Queue.prototype.delayed function #351

0.8.1 / 2014-06-13
==================

  * Fix wrong parameter orders in complete event #343s
  * Graceful shutdown bug fix #328

0.8.0 / 2014-06-11
==================

  * Implement backoff on failure retries #300
  * Allow passing back worker results via done to event handlers #170
  * Allow job producer to specify which keys of `job.data` to be indexed for search #284
  * Waffle.io Badge #332
  * Dropping monkey-patch style redis client connections
  * Update docs: Worker Pause/Resume-ability
  * Update docs: Reliability of Queue event handlers over Job event handlers

0.7.9 / 2014-06-01
==================

  * Graceful shutdown bug fix #336
  * More robust graceful shutdown under heavy load #328

0.7.6 / 2014-05-02
==================

  * Fixed broken monkey-patch style redis connections #323

0.7.0 / 2014-01-24
==================

  * Suppress "undefined" messages on String errors. Closes #230
  * Fix cannot read property id of undefined errors. Closes #252
  * Parameterize limit of jobs checked in promotion cycles. Closes #244
  * Graceful shutdown
  * Worker pause/resume ability, Closes #163
  * Ensure event subscription before job save. Closes #179
  * Fix Queue singleton
  * Fix failed event being called in first attempt. Closes #142
  * Disable search (Search index memory leaks). See #58 & #218
  * Emit error events on both kue and job
  * JS/Coffeescript tests added (Mocha+Should)
  * Travis support added


0.6.2 / 2013-04-03
==================

  * Fix redirection to active for mounted apps


0.6.1 / 2013-03-25
==================

  * Fixed issue preventing polling for new jobs. Closes #192


0.6.0 / 2013-03-20
==================

 * Make pollForJobs actually use ms argument. Closes #158
 * Support delay over HTTP POST. Closes #165
 * Fix natural sorting. Closes #174
 * Update `updated_at` timestamp during `log`, `progress`, `attempt`, or `state` changes. Closes #188
 * Fix redirection to /active. Closes #190

0.5.0 / 2012-11-16
==================

  * add POST /job to create a job
  * fix /job/search hang

0.4.2 / 2012-11-08
==================

  * Revert "Fix delay() not really delaying"
  * Revert "If a job with a delay has more attempts, honor the original delay"

0.4.1 / 2012-09-25
==================

  * fix: if a job with a delay has more attempts, honor the original delay [mathrawka]

0.4.0 / 2012-06-28
==================

  * Added 0.8.0 support

0.3.4 / 2012-02-23
==================

  * Changed: reduce polling by using BLPOP to notify workers of activity [Davide Bertola]

0.3.3 / 2011-11-28
==================

  * Fixed: use relative stats route to support mounting [alexkwolfe]
  * Fixed 0.6.x support
  * Removed empty Makefile

0.3.2 / 2011-10-04
==================

  * Removed unnecessary "pooling"
  * Fixed multiple event emitting. Closes #73
  * Fixed menu styling

0.3.1 / 2011-08-25
==================

  * Fixed auto event subscription. Closes #68
  * Changed: one redis connection for all workers
  * Removed user-select: none from everything. Closes #50

0.3.0 / 2011-08-11
==================

  * Added search capabilities
  * Added `workTime` stat
  * Added removal of stale jobs example
  * Added Queue-level job events, useful for removing stale jobs etc. Closes   * Changed: lazy load reds search [David Wood]
  * Fixed `Job#error` for modules that throw strings or emit `error` events with strings [guillermo] #51
  * Fixed `Job#remove(fn)`
  * Fixed proxy issue with paths, use relative paths [booo]

0.2.0 / 2011-07-25
==================

  * Added infinite scroll
  * Added delayed job support
  * Added configurable redis support [davidwood]
  * Added job windowing. Closes #28
  * Added `Job#delay(ms)`
  * Removed job scrollIntoView
  * Removed fancy scrollbar (for infinite scroll / windowing :( )
  * Removed "More" button
  * Fixed z-index for actions
  * Fixed job mapping. Closes #43

0.1.0 / 2011-07-19
==================

  * Added exposing of progress via redis pubsub
  * Added pubsub job events "complete" and "failed"
  * Fixed: capping of progress > 100 == 100
  * UI: scroll details into view

0.0.3 / 2011-07-07
==================

  * Added caustic to aid in template management
  * Added job attempt support. Closes #31
  * Added `Job.attempts(n)`
  * Added minified jQuery
  * Added cluster integration docs. Closes #13
  * Added GET _/jobs/:from..:to_ to JSON API
  * Fixed: hide "More" on sort
  * Fixed: hide "More" on filter
  * Fixed: removed "error" emission, blows up when no one is listening

0.0.2 / 2011-07-05
==================

  * Added support to update state from UI. Closes #26
  * Added support to alter priority in UI. Closes #25
  * Added filtering by type. Closes #20

0.0.1 / 2011-07-04
==================

  * Initial release
