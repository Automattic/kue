
// Haml - Copyright TJ Holowaychuk <tj@vision-media.ca> (MIT Licensed)

/**
 * Module dependencies.
 */

var sys = require('sys')

/**
 * Version.
 */

exports.version = '0.4.5'

/**
 * Haml template cache.
 */

exports.cache = {}

/**
 * Default error context length.
 */

exports.errorContextLength = 15

/**
 * Self closing tags.
 */
 
exports.selfClosing = [
    'meta',
    'img',
    'link',
    'br',
    'hr',
    'input',
    'area',
    'base'
  ]

/**
 * Default supported doctypes.
 */

exports.doctypes = {
  '5': '<!DOCTYPE html>',
  'xml': '<?xml version="1.0" encoding="utf-8" ?>',
  'default': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
  'strict': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">',
  'frameset': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">',
  '1.1': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">',
  'basic': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN" "http://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd">',
  'mobile': '<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.2//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile12.dtd">'
}

/**
 * Default filters.
 */
 
exports.filters = {
  
  /**
   * Return plain string.
   */
  
  plain: function(str) {
    return str
  },
  
  /**
   * Wrap with CDATA tags.
   */
  
  cdata: function(str) {
    return '<![CDATA[\n' + str + '\n]]>'
  },
  
  /**
   * Wrap with <script> and CDATA tags.
   */
  
  javascript: function(str) {
    return '<script type="text/javascript">\n//<![CDATA[\n' + str + '\n//]]></script>'
  }
}

/**
 * Function templates.
 */
 
exports.templates = {
  
  /**
   * Execute __code__.
   */
  
  code: (function(){
    __code__;
    return ""
  }).toString(),
  
  /**
   * Execute __code__ followed by buffering __block__.
   */
  
  codeBlock: (function(){
    var buf = [];
    __code__
    buf.push(__block__);
    return buf.join("")
  }).toString(),
  
  /**
   * Iterate __vals__ as __val__ while buffering __block__.
   */
  
  iterate: (function(){
    var buf = [];
    if (__vals__ instanceof Array) {
      for (var i = 0, len = __vals__.length; i < len; ++i) {
        var __key__ = i;
        var __val__ = __vals__[i];
        buf.push(__block__);
      }
    } else if (__vals__) {
      var keys = Object.keys(__vals__);
      for (var i = 0, len = keys.length; i < len; ++i) {
        var __key__ = keys[i];
        var __val__ = __vals__[__key__];
        buf.push(__block__);
      }
    }
    return buf.join("")
  }).toString()
}

/**
 * HamlError.
 */

var HamlError = exports.HamlError = function(msg) {
    this.name = 'HamlError'
    this.message = msg
    Error.captureStackTrace(this, exports.render)
}
sys.inherits(HamlError, Error)

/**
 * Lexing rules.
 */

var rules = {
  indent: /^\n( *)(?! *-#)/,
  conditionalComment: /^\/(\[[^\n]+\])/,
  comment: /^\n? *\/ */,
  silentComment: /^\n? *-#([^\n]*)/,
  doctype: /^!!! *([^\n]*)/,
  escape: /^\\(.)/,
  filter: /^:(\w+) */,
  each: /^\- *each *(\w+)(?: *, *(\w+))? * in ([^\n]+)/,
  code: /^\-([^\n]+)/,
  outputCode: /^!=([^\n]+)/,
  escapeCode: /^=([^\n]+)/,
  attrs: /^\{(.*?)\}/,
  tag: /^%([-a-zA-Z][-a-zA-Z0-9:]*)/,
  class: /^\.([\w\-]+)/,
  id: /^\#([\w\-]+)/,
  text: /^([^\n]+)/
}

/**
 * Return error context _str_.
 *
 * @param  {string} str
 * @return {string}
 * @api private
 */

function context(str) {
  return String(str)
    .substr(0, exports.errorContextLength)
    .replace(/\n/g, '\\n')
}

/**
 * Tokenize _str_.
 *
 * @param  {string} str
 * @return {array}
 * @api private
 */

function tokenize(str) {
  var captures,
      token,
      tokens = [],
      line = 1,
      lastIndents = 0,
      str = String(str).trim().replace(/\r\n|\r/g, '\n')
  function error(msg){ throw new HamlError('(Haml):' + line + ' ' + msg) }
  while (str.length) {
    for (var type in rules)
      if (captures = rules[type].exec(str)) {
        token = {
          type: type,
          line: line,
          match: captures[0],
          val: captures.length > 2
            ? captures.slice(1)
            : captures[1]
        }
        str = str.substr(captures[0].length)
        if (type === 'newline' ||
            type === 'indent') ++line
        if (type !== 'indent') break
        var indents = token.val.length / 2
        if (indents % 1)
          error('invalid indentation; got ' + token.val.length + ' spaces, should be multiple of 2')
        else if (indents - 1 > lastIndents)
          error('invalid indentation; got ' + indents + ', when previous was ' + lastIndents)
        else if (lastIndents > indents)
          while (lastIndents-- > indents)
            tokens.push({ type: 'outdent', line: line })
        else if (lastIndents !== indents)
          tokens.push({ type: 'indent', line: line })
        else
          tokens.push({ type: 'newline', line: line })
        lastIndents = indents
      }
    if (token) {
      if (token.type !== 'silentComment')
        tokens.push(token)
      token = null
    } else 
      error('near "' + context(str) + '"')
  }
  return tokens.concat({ type: 'eof' })
}

/**
 * Render template _name_ with the given placeholder _vals_.
 *
 * @param  {string} name
 * @param  {object} vals
 * @return {string}
 * @api private
 */

function template(name, vals) {
  var buf = '(' + exports.templates[name] + ').call(this)'
  for (var key in vals)
    buf = buf.replace(new RegExp(key, 'g'), vals[key])
  return buf
}

// --- Parser

/**
 * Initialize parser with _str_ and _options_.
 */

function Parser(str, options) {
  options = options || {}
  this.tokens = tokenize(str)
  this.xml = options.xml
}

Parser.prototype = {
  
  /**
   * Lookahead a single token.
   *
   * @return {object}
   * @api private
   */
  
  get peek() {
    return this.tokens[0]
  },
  
  /**
   * Advance a single token.
   *
   * @return {object}
   * @api private
   */
  
  get advance() {
    return this.current = this.tokens.shift()
  },
  
  /**
   *    outdent
   *  | eof
   */
  
  get outdent() {
    switch (this.peek.type) {
      case 'eof':
        return
      case 'outdent':
        return this.advance
      default:
        throw new HamlError('expected outdent, got ' + this.peek.type)
    }
  },
  
  /**
   * text
   */
  
  get text() {
    return '"' + this.advance.val.trim() + '"'
  },
  
  /**
   * indent expr outdent
   */
  
  get block() {
    var buf = []
    this.advance
    while (this.peek.type !== 'outdent' &&
           this.peek.type !== 'eof')
      buf.push(this.expr)
    this.outdent
    return buf.join(' + ')
  },
  
  /**
   * indent expr
   */
  
  get textBlock() {
    var token,
        indents = 1,
        buf = []
    this.advance
    while (this.peek.type !== 'eof' && indents)
      switch((token = this.advance).type) {
        case 'newline':
          buf.push('"\\n' + Array(indents).join('  ') + '"')
          break
        case 'indent':
          ++indents
          buf.push('"\\n' + Array(indents).join('  ') + '"')
          break
        case 'outdent':
          --indents
          if (indents === 1) buf.push('"\\n"')
          break
        default:
          buf.push('"' + token.match.replace(/"/g, '\\\"') + '"')
      }
    return buf.join(' + ')
  },
  
  /**
   *  ( attrs | class | id )*
   */
  
  get attrs() {
    var attrs = ['attrs', 'class', 'id'],
        classes = [],
        buf = []
    while (attrs.indexOf(this.peek.type) !== -1)
      switch (this.peek.type) {
        case 'id':
          buf.push('id: "' + this.advance.val + '"')
          break
        case 'class':
          classes.push(this.advance.val)
          break
        case 'attrs':
          buf.push(this.advance.val.replace(/(for) *:/gi, '"$1":'))
      }
    if (classes.length)
      buf.push('"class": "' + classes.join(' ') + '"')
    return buf.length 
      ? ' " + attrs({' + buf.join() + '}) + "'
      : ''
  },
  
  /**
   *   tag
   * | tag text
   * | tag conditionalComment
   * | tag comment
   * | tag outputCode
   * | tag escapeCode
   * | tag block
   */
  
  get tag() {
    var tag = this.advance.val,
        selfClosing = !this.xml && exports.selfClosing.indexOf(tag) !== -1,
        buf = ['"\\n<' + tag + this.attrs + (selfClosing ? '/>"' : '>"')]
    switch (this.peek.type) {
      case 'text':
        buf.push(this.text)
        break
      case 'conditionalComment':
        buf.push(this.conditionalComment)
        break;
      case 'comment':
        buf.push(this.comment)
        break
      case 'outputCode':
        buf.push(this.outputCode)
        break
      case 'escapeCode':
        buf.push(this.escapeCode)
        break
      case 'indent':
        buf.push(this.block)
    }
    if (!selfClosing) buf.push('"</' + tag + '>"')
    return buf.join(' + ')
  },
  
  /**
   * outputCode
   */
  
  get outputCode() {
    return this.advance.val
  },
  
  /**
   * escapeCode
   */
  
  get escapeCode() {
    return 'escape(' + this.advance.val + ')'
  },
  
  /**
   * doctype
   */
  
  get doctype() {
    var doctype = this.advance.val.trim().toLowerCase() || 'default'
    if (doctype in exports.doctypes)
      return '"' + exports.doctypes[doctype].replace(/"/g, '\\"') + '"'
    else
      throw new HamlError("doctype `" + doctype + "' does not exist")
  },
  
  /**
   * conditional comment expr
   */

  get conditionalComment() {
    var condition= this.advance.val
    var buf = this.peek.type === 'indent'
      ? this.block
      : this.expr
    return '"<!--' + condition + '>" + (' + buf + ') + "<![endif]-->"'
  },

  /**
   * comment expr
   */
  
  get comment() {
    this.advance
    var buf = this.peek.type === 'indent'
      ? this.block
      : this.expr
    return '"<!-- " + (' + buf + ') + " -->"'
  },
  
  /**
   *   code
   * | code block 
   */
  
  get code() {
    var code = this.advance.val
    if (this.peek.type === 'indent')
      return template('codeBlock', { __code__: code, __block__: this.block })
    return template('code', { __code__: code })
  },
  
  /**
   * filter textBlock
   */
  
  get filter() {
    var filter = this.advance.val
    if (!(filter in exports.filters))
      throw new HamlError("filter `" + filter + "' does not exist")
    if (this.peek.type !== 'indent')
      throw new HamlError("filter `" + filter + "' expects a text block")
    return 'exports.filters.' + filter + '(' + this.textBlock + ')'
  },
  
  /**
   * each block
   */
  
  get iterate() {
    var each = this.advance
    if (this.peek.type !== 'indent')
      throw new HamlError("'- each' expects a block, but got " + this.peek.type)
    return template('iterate', {
      __key__: each.val[1],
      __vals__: each.val[2],
      __val__: each.val[0],
      __block__: this.block
    })
  },
  
  /**
   *   eof
   * | tag
   * | text*
   * | each
   * | code
   * | escape
   * | doctype
   * | filter
   * | comment
   * | conditionalComment
   * | escapeCode
   * | outputCode
   */
  
  get expr() {
    switch (this.peek.type) {
      case 'id': 
      case 'class':
        this.tokens.unshift({ type: 'tag', val: 'div' })
        return this.tag
      case 'tag':
        return this.tag
      case 'text':
        var buf = []
        while (this.peek.type === 'text') {
          buf.push(this.advance.val.trim())
          if (this.peek.type === 'newline')
            this.advance
        }
        return '"' + buf.join(' ') + '"'
      case 'each':
        return this.iterate
      case 'code':
        return this.code
      case 'escape':
        return '"' + this.advance.val + '"'
      case 'doctype':
        return this.doctype
      case 'filter':
        return this.filter
      case 'conditionalComment':
        return this.conditionalComment
      case 'comment':
        return this.comment
      case 'escapeCode':
        return this.escapeCode
      case 'outputCode':
        return this.outputCode
      case 'newline':
      case 'indent':
      case 'outdent':
        this.advance
        return this.expr
      default:
        throw new HamlError('unexpected ' + this.peek.type)
    }
  },
  
  /**
   * expr*
   */
  
  get js() {
    var buf = []
    while (this.peek.type !== 'eof')
      buf.push(this.expr)
    return buf.join(' + ')
  }
}

/**
 * Escape html entities in _str_.
 *
 * @param  {string} str
 * @return {string}
 * @api private
 */

function escape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
}

/**
 * Render _attrs_ to html escaped attributes.
 *
 * @param  {object} attrs
 * @return {string}
 * @api public
 */

function attrs(attrs) {
  var buf = []
  for (var key in attrs)
    if (typeof attrs[key] === 'boolean') {
      if (attrs[key] === true)
        buf.push(key + '="' + key + '"')
    } else if (attrs[key])
      buf.push(key + '="' + escape(attrs[key]) + '"')
  return buf.join(' ')
}

/**
 * Render a _str_ of haml.
 *
 * Options:
 *
 *   - locals   Local variables available to the template
 *   - context  Context in which the template is evaluated (becoming "this")
 *   - filename Filename used to aid in error reporting
 *   - cache    Cache compiled javascript, requires "filename"
 *   - xml      Force xml support (no self-closing tags)
 *
 * @param  {string} str
 * @param  {object} options
 * @return {string}
 * @api public
 */

exports.render = function(str, options) {
  var parser,
      options = options || {}
  if (options.cache && !options.filename)
    throw new Error('filename option must be passed when cache is enabled')
  return (function(){
    try {
      var fn
      if (options.cache && exports.cache[options.filename])
        fn = exports.cache[options.filename]
      else {
        parser = new Parser(str, options)
        fn = Function('locals, attrs, escape, exports', 'with (locals || {}){ return ' + parser.js + '}')
      }
      return (options.cache
          ? exports.cache[options.filename] = fn
          : fn).call(options.context, options.locals, attrs, escape, exports)
    } catch (err) {
      if (parser && err instanceof HamlError)
        err.message = '(Haml):' + parser.peek.line + ' ' + err.message
      else if (!(err instanceof HamlError))
        err.message = '(Haml): ' + err.message
      if (options.filename)
        err.message = err.message.replace('Haml', options.filename) 
      throw err
    }
  }).call(options.context)
}
