## Reload

  Restart the server the given js `files` have changed.
  `files` may be several directories, filenames, etc, defaulting
  to the script's directory.

### Options

  - `signal` Signal to send, defaults to __SIGTERM__
  - `interval` Watcher interval, defaulting to `100`

### Usage

 The `reload(paths[, signal])` plugin accepts a single path, or an array of paths, watching for __mtime__ changes, and re-loading the workers when a change has been made. By default the __SIGTERM__ signal is sent, killing the workers immediately, however we may pass a `signal` for graceful termination as well.

 Reload when files in `./` (`__dirname`) change:

        cluster(server)
          .use(cluster.reload())
          .listen(3000);

 Reload when files in `./lib` change:

        cluster(server)
          .use(cluster.reload('lib'))
          .listen(3000);

 Reload when files in `./lib`, `./tests`, or the `./index.js` file change:

        cluster(server)
          .use(cluster.reload(['lib', 'tests', 'index.js']))
          .listen(3000);

 Graceful shutdown:
 
       cluster(server)
        .use(cluster.reload('lib', { signal: 'SIGQUIT' }))
        .listen(3000);

 Watching coffee-script files as well.

       cluster(server)
         .use(cluster.reload('lib', { extensions: ['.js', '.coffee'] }))
         .listen(3000);