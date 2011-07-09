
0.4.5 / 2010-06-04
==================

  * Ignoring stray indent

0.4.4 / 2010-05-27
==================

  * Fixed arbitrary whitespace support

0.4.3 / 2010-05-25
==================

  * Fixed support for CRLF / CR line-endings, converted on input
  * Exporting HamlError

0.4.2 / 2010-05-25
==================

  * Added HamlError
  * Buffer newline indentation. Closes #23
  * Benchmarks with node-bench

0.4.1 / 2010-05-17
==================

  * Fixed "- each" with non-enumerables, no longer throws exception
  * Fixed array iteration

0.4.0 / 2010-05-06
==================

  * Using Function constructor instead of eval()
  * Performance enhanced by faster iteration implementation for "- each"

0.3.1 / 2010-04-26
==================

  * Fixed support for tags with hypens (both namespace / tag name, ex: "fb:login-button")

0.3.0 / 2010-04-16
==================

  * Added xml namespace support
  * Added xml support

0.2.0 / 2010-04-06
==================

  * Added conditional comment support [ciaranj]
  * Fixed; Trimming input string before tokenization
  * Fixed issue requiring quoting of "for" when used in attrs [aheckmann]
  * Fixed; Exposing Haml compilation cache. Closes #12
  * Fixed :javascript "type" attr, now "text/javascript" [aheckmann]

0.1.0 / 2010-03-31
==================

  * Added "cache" option, making haml.js over 90 times faster than haml-js
  * Improved textBlock whitespace replication
  * Fixed empty tags followed by class / ids on new lines. Closes #6

0.0.4 / 2010-03-29
==================

  * Added better error reporting

0.0.3 / 2010-03-29
==================

  * Added "filename" option support to aid in error reporting
  * Added exports.compile() to create intermediate javascript
  * Added `make benchmark`
  * Changed; caching function templates to increase performance
  * Fixed; ids and classes allowing underscores. Closes #5
  * Fixed outdent issue when \n is not followed by whitespace. Closes #8

0.0.2 / 2010-03-26
==================

  * Added haml.js vs haml-js benchmarks
  * Fixed; commenting :javascript CDATA

0.0.1 / 2010-03-26
==================

  * Initial release
