
require.paths.unshift('spec', './spec/lib', 'lib')
require('jspec')
require('unit/spec.helper')
haml = require('haml')

JSpec
  .exec('spec/unit/spec.js')
  .run({ reporter: JSpec.reporters.Terminal, fixturePath: 'spec/fixtures', failuresOnly: true })
  .report()
