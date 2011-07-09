var fs = require('fs');
var assert = require('assert');
var sys = require('sys');

var Haml = require("../lib/haml");

fs.readdir('.', function (err, files) {
  files.forEach(function (haml_file) {
    var m = haml_file.match(/^(.*)\.haml/),
        base;
    if (!m) {
      return;
    }
    base = m[1];

    function load_haml(scope) {
      fs.readFile(haml_file, "utf8", function (err, haml) {
        fs.readFile(base + ".html", "utf8", function (err, expected) {
          try {
            var js = Haml.compile(haml);
            var js_opt = Haml.optimize(js);
            var actual = Haml(haml).call(scope.context, scope.locals);
            assert.equal(actual, expected);
            
            sys.puts(haml_file + " Passed")
          } catch (e) {
            var message = e.name;
            if (e.message) { message += ": " + e.message; }
            sys.error(haml_file + " FAILED")
            sys.error(message);
            sys.error("\nJS:\n\n" + js);
            sys.error("\nOptimized JS:\n\n" + js_opt);
            sys.error("\nActual:\n\n" + actual);
            sys.error("\nExpected:\n\n" + expected);
            process.exit();
          }
        });
      });
    }

    // Load scope
    if (files.indexOf(base + ".js") >= 0) {
      fs.readFile(base + ".js", "utf8", function (err, js) {
        load_haml(eval("(" + js + ")"));
      });
    } else {
      load_haml({});
    }
  });
});


