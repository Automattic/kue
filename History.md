
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
