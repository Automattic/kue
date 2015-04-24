// proxy to allow formatting
// and because $ is ugly

var o = function (val) {
    var args = arguments
        , options = args[1]
        , i = 0;

    if ('string' != typeof val) return $(val);
    if (!~val.indexOf('<')) return $(val);

    val = val.replace(/%([sd])/g, function (_, specifier) {
        var arg = args[++i];
        switch (specifier) {
            case 's':
                return String(arg)
            case 'd':
                return arg | 0;
        }
    });

    val = val.replace(/\{(\w+)\}/g, function (_, name) {
        return options[name];
    });

    return $(val);
};

for (var key in $) o[key] = $[key];