
## Logger

 File-based logging of both the _master_ and _worker_ processes.
 
### Usage

The `logger([path[, level]])` plugin accepts an optional `path`, and optional `level` to control the verbosity of the master process logs. By default the log level is _info_.

Outputting to `./logs`:

     cluster(server)
       .use(cluster.logger())
       .listen(3000);


Outputting to `./tmp/logs`:

     cluster(server)
       .use(cluster.logger('tmp/logs'))
       .listen(3000);

Outputting to `/var/log/node` with a log level of `debug`:

      cluster(server)
        .use(cluster.logger('/var/log/node', 'debug'))
        .listen(3000);

Generated files:

      master.log
      workers.access.log
      workers.error.log