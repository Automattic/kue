
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
