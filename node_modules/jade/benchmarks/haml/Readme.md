
# Haml.js

  High performance JavaScript [Haml](http://haml-lang.com) implementation for [nodejs](http://nodejs.org)
  
  For a higher quality implementation you may want to look at my [Jade](http://jade-lang.com) template engine,
  however the syntax is slightly different. Jade's engine may be back-ported to haml.js in the future.

## Installation

  Install the [Kiwi package manager for nodejs](http://github.com/visionmedia/kiwi)
  and run:
  
      $ kiwi install haml

      node> require('haml')

Or npm:

      $ npm install hamljs

      node> require('hamljs')

## About

  Benchmarks rendering the same 21 line haml file located at _benchmarks/page.haml_,
  shows that this library is nearly **65%** or **3 times** faster than haml-js.
  
      Winner: haml.js
      Compared with next highest (haml-js), it's:
      65.39% faster
      2.89 times as fast
      0 order(s) of magnitude faster

  Haml.js attempts to comply with the original [Haml](http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html)
  implementation as well as possible. There are no magic "plugins" like
  found in other JavaScript haml implementations, for example the following
  will work just fine:
  
    - if (items)
      %ul
        - for (var i = 0; i < items.length; ++i)
          %li= items[i]
  
  Iteration is the one exception to these magical plugins,
  since this is **ugly** in JavaScript, you may also:
  
    - if (items)
      %ul
        - each item in items
          %li= item
          
## Usage

    var haml = require('haml')
    haml.render('a string of haml', { a: 'hash', of: 'options' })
    
## Options

  * context
    - when passed the value of "this" becomes the given "context" object
  * locals
    - when passed all members of this object become available to this template
  * filename
    - required when _cache_ is enabled
  * cache
    - compiled intermediate javascript is cached in memory keyed by _filename_
    
## Tags

    %div text

html:

    <div>text</div>
    
## Classes

    %div.article.first
      article text here
      and here
      
html:

    <div class="article first">
      article text here and here
    </div>
    
## Div Class Shortcut

    .comment hey
    
html:

    <div class="comment">hey</div>
    
## Div Id Shortcut

    #article-1 foo
    
html:

    <div id="article-1">foo</div>
    
## Combining Ids and Classes

You may chain id and classes in any order:

    .article#first.summary content
    
html:

    <div id="first" class="article summary">context</div>
    
## Attributes

    %a{ href: 'http://google.com', title: 'Google It' } Google
    
html:

    <a href="http://google.com" title="Google It">Google</a>

Attribute keys such as "for" are automatically quoted
by haml.js, so instead of:

    %label{ 'for': 'something' }

you should:

    %label{ for: 'something' }

which will render:

    <label for="something"></label>
    
## Boolean Attributes

    %input{ type: 'checkbox', checked: true }
    
html:

    <input type="checkbox" checked="checked"/>
    
## Combining Attributes, Ids, and Classes
    
Wemay also contain id and classes before or after:

    %a.button{ href: 'http://google.com', title: 'Google It' }.first Google
    
html:

    <a href="http://google.com" title="Google It" class="button first">Google</a>
    
## Code

Code starting with a hyphen will be executed but
not buffered, where as code using the equals sign
will be buffered:

    - a = 1
    - b = 2
    = a + b
    
html:

    3
    
HTML buffered with equals sign will **always** be escaped:

    = "<br/>"
    
html:
   
    &lt;br/&gt;
    
To prevent escaping of HTML entities we can use _!=_:

    != "<br/>"
    
html:

    <br/>
    
## Iteration

    %ul
      - each item in items
        %li= item
        
html:

    <ul>
      <li>one</li>
      <li>two</li>
      <li>three</li>
    </ul>
    
If you require the key or index of the object
or array during iteration simple append a comma
following another id:

    %ul
      - each item, index in items
        %li= item + '(' + index + ')'
        
html:

    <ul>
      <li>one(0)</li>
      <li>two(1)</li>
      <li>three(2)</li>
    </ul>
    
## Doctypes

Defaults to transitional:
    
    !!!
    
html:

    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    
Optionally pass a supported doctype name:

    !!! strict
    
html:

    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">

currently supported doctypes, which can be
extended simply by adding values to to _haml.doctypes_.

    '5': '<!DOCTYPE html>',
    'xml': '<?xml version="1.0" encoding="utf-8" ?>',
    'default': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
    'strict': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">',
    'frameset': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">',
    '1.1': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">',
    'basic': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN" "http://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd">',
    'mobile': '<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.2//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile12.dtd">'


## :cdata

    %script
      :cdata
        foo
        
html:

    <script><![CDATA[
    foo
    ]]></script>
    
## :javascript

    %head
      :javascript
        if (foo)
          if (bar)
            alert('baz')
      
html:

    <head>
      <script type="javascript">
      //<![CDATA[
      if (foo)
        if (bar)
          alert('baz')
      //]]>
      </script>
    </head>
    
## Extending Haml

### Adding Filters

    var haml = require('haml')
    haml.filters.my_filter = function(str) {
      return doSomethingWith(str)
    }

by registering the filter function _my_filter_ we can now
utilize it within our Haml templates as shown below:
    %p
      :my_filter
        some text
        here yay
        whoop awesome

### Adding Doctypes

    var haml = require('haml')
    haml.doctypes.foo = '<!DOCTYPE ... >'
    
Will now allow you to:
    !!! foo
    
## Running Benchmarks

To run benchmarks against [haml-js](http://github.com/creationix/haml-js)
simply execute:

    $ git submodule update --init
    $ node benchmarks/run.js
    
## More Information

  * View _spec/fixtures_ for more examples
  * Official [Haml](http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html) reference
  * JavaScript [Sass](http://github.com/visionmedia/sass.js) implementation

## License 

(The MIT License)

Copyright (c) 2010 TJ Holowaychuk &lt;tj@vision-media.ca&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.