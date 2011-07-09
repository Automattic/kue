
## REPL

 Provides live administration tools for inspecting state, spawning and killing workers, and more. The __REPL__ plugin itself is extensible, for example the `stats()` plugin provides a __REPL__ function named `stats()`.

### Usage

 The `repl([port | path])` accepts a `port` or unix domain socket `path`, after which you may telnet to at any time.

Launch the __REPL__ with a local socket:
 
      cluster(server)
        .use(cluster.repl('/var/run/cluster.sock'))
        .listen(3000);

Start a telnet session:

    $ telnet /var/run/cluster.sock

    cluster> help()

      Commands
      help(): Display help information
      spawn(n): Spawn one or more additional workers
      pids(): Output process ids
      kill(id, signal): Send signal or SIGTERM to the given worker
      shutdown(): Gracefully shutdown server
      stop(): Hard shutdown
      restart(): Gracefully restart all workers
      echo(msg): echo the given message
      stats(): Display server statistics

__NOTE__: a local socket is recommended, otherwise this may be a secure hole.

### pids()

 Outputs the master / worker process ids.

    cluster> pids()

      pids
      master: 1799
      worker #0: 1801
      worker #1: 1802
      worker #2: 1803
      worker #3: 1804

### spawn()

 Spawn an additional worker.

    cluster> spawn()
    spawning 1 worker
    cluster> pids()

      pids
      master: 1799
      worker #0: 1801
      worker #1: 1802
      worker #2: 1803
      worker #3: 1804
      worker #4: 1809

### spawn(n)

 Spawn `n` workers:
 
     cluster> spawn(4)
     spawning 4 workers
     cluster> pids()

       pids
       master: 1817
       worker #0: 1818
       worker #1: 1819
       worker #2: 1820
       worker #3: 1821
       worker #4: 1825
       worker #5: 1826
       worker #6: 1827
       worker #7: 1828

### kill(id[, signal])

Kill worker `id` with the given `signal` or __SIGTERM__. For graceful termination use __SIGQUIT__.

    cluster> pids()

      pids
      master: 1835
      worker #0: 1837
      worker #1: 1838
      worker #2: 1839
      worker #3: 1840

    cluster> kill(2)
    sent SIGTERM to worker #2
    cluster> kill(3)
    sent SIGTERM to worker #3
    cluster> pids()

      pids
      master: 1835
      worker #0: 1837
      worker #1: 1838
      worker #2: 1843
      worker #3: 1844

### restart()

 Gracefully restart all workers.
 
     cluster> pids()

       pids
       master: 1835
       worker #0: 1837
       worker #1: 1838
       worker #2: 1843
       worker #3: 1844

     cluster> restart()
     restarting 4 workers
     cluster> pids()

       pids
       master: 1835
       worker #0: 1845
       worker #1: 1849
       worker #2: 1848
       worker #3: 1847

### Defining REPL Functions

 To define a function accessible to the __REPL__, all we need to do is call `cluster.repl.define()`, passing the function, as well as a description string.

 Below we define the `echo()` function, simply printing the input `msg` given. As you can see our function receivers the `Master` instance, the __REPL__ `sock`, and any arguments that were passed. For example `echo("test")` would pass the `msg` as `"test"`, and `echo("foo", "bar")` would pass `msg` as `"foo"`, and `arguments[3]` as `"bar"`.
 
       repl.define('echo', function(master, sock, msg){
         sock.write(msg + '\n');
       }, 'echo the given message');

 Shown below is a more complete example.

      var cluster = require('../')
        , repl = cluster.repl
        , http = require('http');

      var server = http.createServer(function(req, res){
        var body = 'Hello World';
        res.writeHead(200, { 'Content-Length': body.length });
        res.end(body);
      });

      // custom repl function

      repl.define('echo', function(master, sock, msg){
        sock.write(msg + '\n');
      }, 'echo the given message');

      // $ telnet localhots 8888

      cluster(server)
        .use(repl(8888))
        .listen(3000);