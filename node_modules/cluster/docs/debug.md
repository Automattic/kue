
## Debug

Outputs verbose debugging information to _stderr_.

      info - master started
      info - worker 0 spawned
      info - worker 1 spawned
      info - worker 2 spawned
      info - worker 3 spawned
      info - worker 2 connected
      info - worker 0 connected
      info - worker 3 connected
      info - worker 1 connected
      info - listening for connections
    ^C  info - shutting down
      warning - kill(SIGKILL)
      info - shutdown complete
      warning - worker 2 died
      warning - worker 0 died
      warning - worker 3 died

## Usage

     cluster(server)
       .use(cluster.debug())
       .listen(3000);

### Options

  - `colors`  enable color output, defaults to true