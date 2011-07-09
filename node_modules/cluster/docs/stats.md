
## Stats

 The stats plugin collects statistics from the events emitter by the master process, and exposes a `stats()` __REPL__ function.


### Usage

To utilize simply `use()` both the `stats()` and `repl()` plugins.

      cluster(server)
        .use(cluster.stats())
        .use(cluster.repl(8888))
        .listen(3000);

Telnet to the repl:

      $ telnet localhost 8888

### stats()

 After manually killing two workers, the stats below show information regarding system load average, uptime, total workers spawned, deaths, worker-specific stats and more.

    cluster> stats()

      Master
      os: Darwin 10.5.0
      state: active
      started: Fri, 11 Feb 2011 16:58:48 GMT
      uptime: 2 minutes
      workers: 4
      deaths: 2

      Resources
      load average: 0.35 0.23 0.15
      cores utilized: 4 / 4
      memory at boot (free / total): 2.18gb / 4.00gb
      memory now (free / total): 2.08gb / 4.00gb

      Workers
      0: 2 minutes
      1: 2 minutes
      2: 1 minute
      3: 22 seconds

### Options

  - `connections`  enable connection statistics
  - `requests`     enable request statistics

### Connection Statistics

  Cluster can report on connections made to the server in each worker. To utilize simply pass `{ connections: true }`, and then view the stats in the REPL. You will now see the total number of connections made, and the total active connections, along with a break-down of connections per-worker, leading the pipe is the active, trailing the pipe is the total number of connections.
  
      Workers
      connections total: 60
      connections active: 0
      0: 15 seconds 0|4
      1: 15 seconds 0|1
      2: 15 seconds 0|25
      3: 15 seconds 0|30

### Request Statistics

  Cluster supports reporting on requests as well, currently only tallying up the total number, however is capable of much more. The REPL `stats()` output below is the result of passing `.use(cluster.stats({ connections: true, requests: true }))`.
  
  
      Workers
      connections total: 60
      connections active: 0
      requests total: 24064
      0: 15 seconds 0|4|3358
      1: 15 seconds 0|1|1126
      2: 15 seconds 0|25|9613
      3: 15 seconds 0|30|9967

### Events

  When the options shown above are used, events are also emitted, so even if you do not plan on using the REPL, these events may be helpful to other plugins.

  - `client connection`, worker
  - `client disconnection`, worker
  - `client request`, worker, request
