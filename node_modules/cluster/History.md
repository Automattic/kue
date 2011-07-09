
0.6.4 / 2011-06-14 
==================

  * Fix for json framing. Closes #109

0.6.3 / 2011-06-11 
==================

  * Added `{ color: false }` option to `debug()`
  * Fixed; close socketpair fds when worker dies
  * Fixed `Master#listen()` with env specific config. Closes #98

0.6.2 / 2011-05-11 
==================

  * Fixed IPC for workers without a server. Closes #91
  * Fixed `close(fd)` issue for Master without a server. Closes #89

0.6.1 / 2011-04-26 
==================

  * Changed; cli commands will now signal orphaned children
  * Changed; postpone spawning until "listening" this _should_ fix our EINVAL issue
  * Changed; exit > 0 when trying to use the `cli()` when cluster is not running
  * Changed; `cli()` will still operate on orphans

0.6.0 / 2011-04-18 
==================

  * Added support to run cluster without a server. Closes #72
  * Renamed titles to "cluster" and "cluster worker". closes #82

0.5.7 / 2011-04-17 
==================

  * Added `lightRequests` option to `stats()`

0.5.6 / 2011-04-15 
==================

  * Added; expose utils, helpful for plugins
  * Added; default both `Master#spawn()` and `Master#remove()` to 1

0.5.5 / 2011-04-05 
==================

  * Revert "Changed; demote user/group in master"

0.5.4 / 2011-04-05 
==================

  * Added `title` and `worker title` settings. Closes #54
  * Added `request complete` `stats()` event
  * Changed; demote user/group in master

0.5.3 / 2011-03-30 
==================

  * Added support for changing watched file extensions [Eiríkur Nilsson]
  * Fixed; reload() using extname() instead of indexOf() [reported by solsys]

0.5.1 / 2011-03-24 
==================

  * Changed; only caught uncaughtExceptions when no other listeners are present

0.5.0 / 2011-03-24 
==================

  * Added `connections` option to `stats()` plugin.
    Reports connections and disconnections, displaying in the REPL.
  * Added `requests` option to `stats()` plugin.
    Reports request statistics, displaying in the REPL.
  * Added support for plugins to work within workers. Closes #27
  * Fixed json framing race-condition. Closes #64

0.4.2 / 2011-03-15 
==================

  * Fixed `user` / `group` options. Closes #60
  * Fixed; abort on many immediate worker deaths within boot
  * Fixed `cli()` exit when working with `reload()` (or anything else keeping the event loop active)

0.4.1 / 2011-03-10 
==================

  * Added cyclic restart timeouts. Closes #23
  * Remove master __SIGHUP__ as restart

0.4.0 / 2011-03-08 
==================

  * Added `worker removed` event
  * Added `spawn(-n, signal)` support defaulting to __SIGQUIT__
  * Added `spawn(-n)` support. Closes #46

0.3.3 / 2011-03-03 
==================

  * Added __CLUSTER_WORKER___ env var with the workers id

0.3.2 / 2011-03-01 
==================

  * Fixed bug when using `cluster(filename)`, previously still requiring for master

0.3.1 / 2011-02-28 
==================

  * Added `cluster(filename)` support. Closes #45
    This is highly recommended, view the API docs
    on the site for more info.

0.3.0 / 2011-02-28 
==================

  * Added "worker exception" event. Closes #41
  * Added `listen()` host dns resolution. Closes #35
  * Added `pidfiles()` helper `master.pidof(name)`
  * Added; `reload()` ignoring _node_modules_ and similar dirs. Closes #31
  * Fixed master __PPID__ reference. Closes #38
  * Fixed restart __SIGQUIT__ default
  * Fixed; using `-g` for graceful shutdown instead of duplicate `-s`. Closes #39

0.2.4 / 2011-02-25 
==================

  * Added `Master#preventDefault` support to clean `cli()`.
    Plugins can now tell master to "prevent its default behaviour", aka
    listening for connections.

  * Fixed bug preventing consistent envs. Closes #37 [reported by sambarnes]
    This caused `require.paths` to be altered.

  * Fixed; throw `pidfiles()` related errors, instead of ignoring

0.2.3 / 2011-02-21 
==================

  * Fixed `reload()` plugin; protect against cyclic restarts.

0.2.2 / 2011-02-21 
==================

  * Added __SIGCHLD__ trap to notify master of killed worker.
    This means that master can now recover a child that
    is __KILL__ed.
  * Removed `Master#workerKilled()` call from worker

0.2.1 / 2011-02-21 
==================

  * Added `Master#do()`

0.2.0 / 2011-02-21 
==================

  * Added; maintaining worker count on __SIGCHLD__. Closes #28
  * Added; defaulting `reload()` to the servers root dir
  * Changed; `reload()` filtering out non-js files. Closes #30
  * Removed __SIGHUP__ trap from worker

0.1.1 / 2011-02-18 
==================

  * Added vhost example
  * Added restarts stat
  * Added `'all'` env support, `in('all')` executing regardless
    of the environment. Useful when `listen()`ing on the same port
    regardless.

  * Changed; `working directory` setting defaulting to the script directory (POLS)

0.1.0 / 2011-02-18 
==================

  * Added TCP echo server example
  * Added REPL `shutdown()` function
  * Added REPL `stop()` function
  * Added master spawning strategy
    On restart, master now spawns a new master to accept
    connections while the previous works (and master) finish
    and die off.
  * Added `Master#in()` for environment based usage. Closes #22
    For example:
        cluster(server)
          .in('development')
            .use(cluster.debug())
            .use(cluster.repl())
            .listen(3000)
          .in('production')
            .use(cluster.logger())
            .listen(80);

  * Fixed some test race-conditions
  * Fixed event leak. Closes #18

0.0.4 / 2011-02-17 
==================

  * Fixed `stats()` / `repl()` breakage when used with 0.2.x due to os mod. Closes #16
  * Changed; close _REPL_ connections on shutdown

0.0.3 / 2011-02-16 
==================

  * Added log dependency to _package.json_. Closes #14

0.0.2 / 2011-02-15 
==================

  * Fixed `process.setuid()` typo

0.0.1 / 2011-02-15 
==================

  * Initial commit