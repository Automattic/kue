
var fs = require('fs'),
    haml = require('../lib/haml'),
    hamlJS = require('./haml-js/lib/haml'),
    page = fs.readFileSync('benchmarks/page.haml')

var js = hamlJS.compile(page)

exports.compare = {
    'haml.js': function(){
        haml.render(page)
    },
    'haml.js cached': function(){
        haml.render(page, { cache: true, filename: 'page.haml' })
    },
    'haml-js': function(){
        hamlJS.render(page)
    },
    'haml-js cached': function(){
        hamlJS.execute(js)
    },
    'haml-js cached / optimized': function(){
        hamlJS.execute(js)
    }
}
