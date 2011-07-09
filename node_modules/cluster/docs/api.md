
## API

 The Cluster API at its core is extremely simple, all we need to do is pass
 our tcp or http `server` to `cluster()`, then call `listen()` as we would on the `http.Server` itself.


     var cluster = require('../')
       , http = require('http');

     var server = http.createServer(function(req, res){
       res.writeHead(200);
       res.end('Hello World');
     });

     cluster(server)
       .listen(3000);

 Alternatively (and recommended) is to export your server instance via `module.exports`, and supply a path to `cluster()`. For example _app.js_:
 
     module.exports = http.createServer(....);

 and _server.js_ with our cluster logic, allowing our server to be `require()`ed within tests, and preventing potential issues by having open database connections etc within the master processes, as only the workers need access to the `server` instance.

    cluster('app')
      .listen(3000);

 A good example if this, is a long-lived database connection. Our _app.js_ may have this initialized at the top, which although will work fine stand-alone, may cause cluster's master processes to hang when restarting or closing due to the connection remaining active in the event loop.
 
     var db = redis.createClient();

### Abstract Clusters

 Cluster is not bound to servers, cluster can be used to manage processes for processing job queues etc. Below is a minimalist example of this, simply invokes `cluster()` with no object, spawning a worker per cpu:
 
      var cluster = require('cluster');

      var proc = cluster().start();

      if (proc.isWorker) {
        // do things within the worker processes
      } else {
        // do something within the master
      }

### Plugins

 A plugin simple a function that accepts the `master` process. Most plugin functions _return_ another anonymous function, allowing them to accept options, for example:
 
    function myPlugin(path){
      return function(master) {
        // do stuff
      }
    }

 To use them, all we need to do is pass it to the `use()` method:
 
    cluster(server)
      .use(myPlugin('/some/path'))
      .listen(3000);

 To use a plugin that is bundled with Cluster simply grab it from the `cluster` object:
 
     cluster(server)
       .use(cluster.logger())
       .listen(3000);

### Settings

 Below are the settings available:
 
   - `workers`  Number of workers to spawn, defaults to the number of CPUs or `1`
   - `working directory`  Working directory defaulting to the script's dir
   - `backlog`  Connection backlog, defaulting to 128
   - `socket path`  Master socket path defaulting to `./`
   - `timeout` Worker shutdown timeout in milliseconds, defaulting to `60000`
   - `title` master process title defaulting to "cluster"
   - `worker title` worker process title defaulting to "cluster worker"
   - `user`  User id / name
   - `group`  Group id / name

 We can take what we have now, and go on to apply settings using the `set(option, value)` method. For example:
 
    cluster(server)
      .set('working directory', '/')
      .set('workers', 5)
      .listen(3000);

### Signals

 Cluster performs the following actions when handling signals:
 
   - `SIGINT`   hard shutdown
   - `SIGTERM`  hard shutdown
   - `SIGQUIT`  graceful shutdown
   - `SIGUSR2`  restart workers

### Events

 The following events are emitted, useful for plugins or general purpose logging etc.
 
   - `start`. When the IPC server is prepped
   - `worker`. When a worker is spawned, passing the `worker`
   - `listening`. When the server is listening for connections
   - `closing`. When master is shutting down
   - `close`. When master has completed shutting down
   - `worker killed`. When a worker has died
   - `worker exception`. Worker uncaughtException. Receives the worker and exception object
   - `kill`. When a `signal` is being sent to all workers
   - `restarting`. Restart requested by REPL or signal. Receives an object
     which can be patched in order to preserve plugin state.
   - `restart`. Restart complete, new master established, previous killed.
     Receives an object with state preserved by the `restarting` even,
     patched in the previous master.

### Master#state

 Current state of the master process, one of:
 
   - `active`
   - `hard shutdown`
   - `graceful shutdown`

### Master#isWorker

 `true` when the script is executed as a worker.

      cluster = cluster(server).listen(3000);

      if (cluster.isWorker) {
        // do something
      }

  Alternatively we can use the __CLUSTER_WORKER__ env var, populated with
  the worker's id.

### Master#isMaster

`true` when the script is executed as master.

     cluster = cluster(server).listen(3000);

     if (cluster.isMaster) {
       // do something
     }

### Master#set(option, value)

  Set `option` to `value`.

### Master#use(plugin)

  Register a `plugin` for use.

### Master#in(env)

 Conditionally perform the following action, if 
 __NODE_ENV__ matches `env`.

     cluster(server)
       .in('development').use(cluster.debug())
       .in('development').listen(3000)
       .in('production').listen(80);

 The environment conditionals may be applied to several calls:
 
     cluster(server)
       .set('working directory', '/')
       .in('development')
         .set('workers', 1)
         .use(cluster.logger('logs', 'debug'))
         .use(cluster.debug())
         .listen(3000)
       .in('production')
         .set('workers', 4)
         .use(cluster.logger())
         .use(cluster.pidfiles())
         .listen(80);

  If we perform the same action for environments, set them before
  the first `in()` call, or use `in('all')`.

    cluster(server)
      .set('working directory', '/')
      .do(function(){
        console.log('some arbitrary action');
      })
      .in('development')
        .set('workers', 1)
        .use(cluster.logger('logs', 'debug'))
        .use(cluster.debug())
      .in('production')
        .set('workers', 4)
        .use(cluster.logger())
        .use(cluster.pidfiles())
      .in('all')
        .listen(80);

### Master#spawn(n)

  Spawn `n` additional workers.

### Master#close()

  Graceful shutdown, waits for all workers to reply before exiting.

### Master#destroy()

  Hard shutdown, immediately kill all workers.

### Master#restart([signal])

  Defaults to a graceful restart, spawning a new master process, and sending __SIGQUIT__ to the previous master process. Alternatively a custom `signal` may be passed.

### Master#kill([signal])

 Sends __SIGTERM__ or `signal` to all worker processes. This method is used by `Master#restart()`, `Master#close()` etc.