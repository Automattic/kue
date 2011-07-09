var FILE = require("file");
var ASSERT = require("assert");

var Haml = require("../lib/haml");

FILE.glob("test/*.haml").forEach(function(hamlFile) {
    exports["test " + hamlFile] = function() {
        var scopeFile = hamlFile.replace(/haml$/, "js");
        var htmlFile = hamlFile.replace(/haml$/, "html");

        var haml = FILE.read(hamlFile);
        var expected = FILE.read(htmlFile);
        var scope = FILE.exists(scopeFile) ? eval("("+FILE.read(scopeFile)+")") : {};

        var js = Haml.compile(haml);
        var js_opt = Haml.optimize(js);
        var actual = Haml.execute(js_opt, scope.context, scope.locals);
        ASSERT.equal(actual.trim(), expected.trim());
    }
});

if (module == require.main)
    require("os").exit(require("test").run(exports));
