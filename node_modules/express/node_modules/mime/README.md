# mime

Support for mapping between file extensions and MIME types.  This module uses the latest version of the Apache "mime.types" file (maps over 620 types to 800+ extensions).  It is also trivially easy to add your own types and extensions, should you need to do that.

## Install

Install with [npm](http://github.com/isaacs/npm):

    npm install mime

## API

### mime.lookup(path) - lookup the type for a file or extension

    var mime = require('mime');

    mime.lookup('/path/to/file.txt');         // => 'text/plain'
    mime.lookup('file.txt');                  // => 'text/plain'
    mime.lookup('.txt');                      // => 'text/plain'
    mime.lookup('htm');                       // => 'text/html'

### mime.extension(type) - lookup the default extension for type

    mime.extension('text/html');                 // => 'html'
    mime.extension('application/octet-stream');  // => 'bin'

### mime.charsets.lookup() - map mime-type to charset

    mime.charsets.lookup('text/plain');        // => 'UTF-8'

(The logic for charset lookups is pretty rudimentary.  Feel free to suggest improvements.)

## "Can you add support for [some type/extension]?"

Start by adding support for the type in your project using the mime.define() or mime.load() methods (documented below).

If there's a type that is shared across node.js modules, by different people, create an issue here and we'll add it if it makes sense.

If the type in question applies to projects outside the node.js community (e.g. if [IANA](http://www.iana.org/assignments/media-types/) approves a new type) file a [bug with Apache](http://httpd.apache.org/bug_report.html) and create an issue here that links to it.

### mime.define() - Add custom mime/extension mappings

    mime.define({
        'text/x-some-format': ['x-sf', 'x-sft', 'x-sfml'],
        'application/x-my-type': ['x-mt', 'x-mtt'],
        // etc ...
    });

    mime.lookup('x-sft');                 // => 'text/x-some-format'
    mime.extension('text/x-some-format'); // => 'x-sf'

### mime.load(filepath) - Load mappings from an Apache ".types" format file

    mime.load('./my_project.types');
