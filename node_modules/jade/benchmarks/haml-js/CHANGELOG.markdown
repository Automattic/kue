# HAML-JS Changelog

- **v0.2.5** - *2010-05-06* - NPM support

  Fixed to work with Node Package Manager

- **v0.2.4** - *2010-04-16* - Bug fixes, XML support

  Allow for commas in calls to helpers in attributes.  Also make haml more XML friendly.

- **v0.2.3** - *2010-04-10* - Bug fixes

  Fixed an issue where "content" html attributes got munched. (This broke meta tags)

- **v0.2.2** - *2010-04-05* - Bug fixes

  Fixed two issues where the parser incorrectly parsed blank lines and extra spaces in attribute blocks.

- **v0.2.1** - *2010-04-01* - Minor speed tweak

  `Haml()` now caches the eval step so that there is no eval in executing a compiled template.  This should make things a bit faster.

- **v0.2.0** - *2010-03-31* - Function based API, Safe whitespace, Code interpolation.

  At the request of some users, I've removed the new insertion into the generated html.  This means that most html will be on one long line, but as an added advantage you won't have that extra whitespace next to your anchor labels messing up your visual display.
  
  Also I added string interpolation to every place I could fit it.  This means you can do crazy stuff like interpolate within strings in attributes, in the body on plain text sections, and of course in javascript and css plugin blocks.
  
  In order to tame the API, I deprecated the four old interfaces `compile`, `optimize`, `execute` and `render`.  The new API is that the Haml/exports object itself is now a function that takes in haml text and outputs a compiled, optimized, ready to execute function.

- **0.1.2** - *2010-02-03* - Bug fixes, plugin aliases, CommonJS, and more...

  This is a big release with many improvements.  First haml-js is now a CommonJS module and is in the Tusk repository.  Thanks to Tom Robinson for helping with that.  Some of the plugins got aliases for people who didn't like the original name.  For example, you can now do `:javascript` instead of `:script` and `:for` instead of `:each`.  There were many bug fixes now that the code is starting to be actually used by myself and others.

- **0.1.1** - *2010-01-09* - Add :css and :script plugins

  Added two quick plugins that make working with javascript and css much easier.

 - **0.1.0** - *2010-01-09* - Complete Rewrite

   Rewrote the compiler to be recursive and compile to JavaScript code instead of JSON data structures.  This fixes all the outstanding bugs and simplifies the code.  Pending is restoring the `:script` and `:css` plugins.

 - **0.0.1** - *2009-12-16* - Initial release

   Change how haml is packaged. It is a pure JS function with no node dependencies. There is an exports hook for commonjs usability. It's now the responsibility of the script user to acquire the haml text.


