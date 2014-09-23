0.8.5 / 2014-08-08
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
  * Fixed `Job#error` for modules that throw strings or emit `error` events with strings [guillermo]
#51
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
