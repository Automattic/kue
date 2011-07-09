
## CLI

 Adds a command-line interface to your cluster.

### Usage

This plugin requires that you use `pidfiles()`
above `cli()`, so that the pidfile directory
is exposed.

      cluster(server)
        .use(cluster.pidfiles())
        .use(cluster.cli())
        .listen(3000);

Once set up our server script serves as both
the master, and the CLI. For example we may
still launch the server(s) as shown below.

       $ nohup node server.js &

However now we may also utilize commands
provided by this plugin.

      $ node server.js status

      master 3281 alive
      worker 0 3282 dead
      worker 1 3283 alive
      worker 2 3284 alive
      worker 3 3285 alive

      $ node server.js restart
      $ node server.js shutdown

For more command information use `--help`.

      $ node server.js --help

### Defining CLI Commands

 Plugins may define additional commands, simply by invoking `cluster.cli.define()` passing the flag(s), a callback function,
 and a description. Below is the implementation of `--help` for reference:

      var cli = require('cluster').cli;

      cli.define('-h, --help, help', function(master){
        console.log('\n  Usage: node <file> <command>\n');
        commands.forEach(function(command){
          console.log('    '
            + command.flags.join(', ')
            + '\n    '
            + '\033[90m' + command.desc + '\033[0m'
            + '\n');
        });
        console.log();
        process.exit();
      }, 'Show help information');
