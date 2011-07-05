
/*!
 * LearnBoost - oQuery
 * Copyright (c) 2011 TJ LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

o = (function(){

  /**
   * Global reference.
   */

  var global = this;

  /**
   * Slice reference.
   */

  var slice = [].slice;

  /**
   * HTML parent mappings.
   */

  var map = {
      tr: [2, '<table><tbody>', '</tbody></table>']
    , td: [3, '<table><tbody><tr>', '</tr></tbody></table>']
    , _default: [0, '', '']
  };

  /**
   * Check if `obj` is a function.
   *
   * @param {Mixed} obj
   * @return {Boolean}
   * @api private
   */

  function isFunction(obj) {
    return obj && obj.call && obj.apply;
  }

  /**
   * Add class `name` to `classes`.
   *
   * @param {String} classes
   * @param {String} name
   * @return {String}
   * @api private
   */

  function addClass(classes, name) {
    return classes.split(/\s+/).concat(name).join(' ');
  }

  /**
   * Remove class `name` from `classes`.
   *
   * @param {String} classes
   * @param {String} name
   * @return {string}
   * @api private
   */

  function removeClass(classes, name) {
    return classes.split(/\s+/).filter(function(val){
      return val != name;
    }).join(' ');
  }

  /**
   * Return an Element from `html`.
   *
   * @param {String} html
   * @return {Element}
   * @api public
   */

  function fromHTML(html, args) {
    var div = document.createElement('div')
      , options = args[1]
      , i = 0;

    html = html.replace(/%([sd])/g, function(_, specifier){
      var arg = args[++i];
      switch (specifier) {
        case 's': return String(arg)
        case 'd': return arg | 0;
      }
    });

    html = html.replace(/\{(\w+)\}/g, function(_, name){
      return options[name];
    });

    var type = /^<(\w+)/.exec(html)[1]
      , wrap = map[type] || map._default
      , depth = wrap[0];

    div.innerHTML = wrap[1] + html + wrap[2];
    while (depth--) div = div.lastChild;

    return new oQuery(div.childNodes);
  }

  /**
   * Initialize an `oQuery` with the given `val`, where
   * `val` may be one of the following:
   *
   *    - dom content "ready" callback
   *    - selector string
   *    - array of nodes
   *    - node list
   *    - single node
   *
   * @param {oQuery|Function|String|NodeList|Array|Node} val
   * @api private
   */

  oQuery = function oQuery(val, args) {
    // query or html
    if ('string' == typeof val) {
      if (~val.indexOf('<')) return fromHTML(val, arguments);
      return new oQuery(document.querySelectorAll(val));
    }

    // oQuery object
    if (val instanceof oQuery) return val;

    // callback
    if (isFunction(val)) {
      addEventListener('DOMContentLoaded', val, false);
      return;
    }

    // return instance
    if (global == this) return new oQuery(val, arguments);

    // empty
    this.nodes = [];

    // falsey
    if (!val) return;

    // listener map
    this.listeners = {};

    // node list
    if ('number' == typeof val.length) {
      this.nodes = slice.call(val);
      return;
    }

    // single node
    if (val.nodeType) {
      this.nodes = [val];
      return;
    }
  }

  /**
   * Push `el`.
   *
   * @param {Node} el
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.push = function(el){
    this.nodes.push(el instanceof oQuery
      ? el.get(0)
      : el);
    return this;
  };

  /**
   * Return the classes, if any, or return an empty array.
   *
   * @return {Array}
   * @api public
   */

  oQuery.prototype.classes = function(){
    var el = this.get(0);
    if (!el) return [];
    return el.className.length
      ? el.className.trim().split(/\s+/)
      : [];
  };

  /**
   * Remove class `name`.
   *
   * @param {String} name
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.addClass = function(name){
    return this.each(function(el){
      el = el.get(0);
      el.className = addClass(el.className, name);
    });
  };

  /**
   * Add class `name`.
   *
   * @param {String} name
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.removeClass = function(name){
    return this.each(function(el){
      el = el.get(0);
      el.className = removeClass(el.className, name);
    });
  };

  /**
   * Remove all nodes from the DOM.
   *
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.remove = function(){
    return this.each(function(el){
      el = el.get(0);
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  };

  /**
   * Append `val`.
   *
   * @param {Mixed} val
   * @return {oQuery} val
   * @api public
   */

  oQuery.prototype.append = function(val){
    return oQuery(val).appendTo(this.at(0));
  };

  /**
   * Prepend `val`.
   *
   * @param {Mixed} val
   * @return {oQuery} val
   * @api public
   */

  oQuery.prototype.prepend = function(val){
    return oQuery(val).prependTo(this);
  };

  /**
   * Append `val`.
   *
   * @param {Mixed} val
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.appendTo = function(val){
    val = oQuery(val).get(0);
    if (!val) return this;
    return this.each(function(el){
      val.appendChild(el.get(0));
    });
  };

  /**
   * Prepend `val`.
   *
   * @param {Mixed} val
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.prependTo = function(val){
    val = oQuery(val).get(0);
    if (!val) return this;
    return this.each(function(el){
      val.insertBefore(el.get(0), val.firstChild);
    });
  };

  /**
   * Find descendants with `selector`.
   *
   * @param {String} selector
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.find = function(selector){
    // TODO: finish
    if (!this.get(0)) return new oQuery;
    return oQuery(this.get(0).querySelectorAll(selector));
  };

  /**
   * Return the number of nodes.
   *
   * @return {Number}
   * @api public
   */

  oQuery.prototype.length = function(){
    return this.nodes.length;
  };

  /**
   * Set css `prop` to `val`.
   *
   * @param {String} prop
   * @param {String} val
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.css = function(prop, val){
    return this.each(function(el){
      el.get(0).style.setProperty(prop, val, '');
    });
  };

  /**
   * Hide the nodes.
   *
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.hide = function(){
    return this.each(function(el){
      el = el.get(0);
      el._display = el._display || getComputedStyle(el).display;
    }).css('display', 'none');
  };

  /**
   * Show the nodes.
   *
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.show = function(){
    return this.each(function(el){
      el = el.get(0);
      el.style.display = el._display;
    });
  };

  /**
   * Set the text to `val`.
   *
   * @param {String} val
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.text = function(val){
    if (0 == arguments.length) return this.get(0)
      ? this.get(0).textContent
      : '';
    return this.each(function(el){
      el.get(0).textContent = val;
    });
  };

  /**
   * Return node at `i` as an `oQuery`.
   *
   * @param {Number} i
   * @return {oQuery}
   * @api public
   */

  oQuery.prototype.at = function(i){
    return new oQuery(this.get(i));
  };

  /**
   * Return the `Node` at `i`.
   *
   * @param {Number} i
   * @return {Node}
   * @api public
   */

  oQuery.prototype.get = function(i){
    return this.nodes[i];
  };

  /**
   * Iterate nodes with the given callback `fn(el, i)`.
   *
   * @param {Function} fn
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.each = function(fn){
    var nodes = this.nodes
      , len = nodes.length;

    for (var i = 0; i < len; ++i) {
      fn(new oQuery(nodes[i]), i);
    }

    return this;
  };

  /**
   * Map nodes with the given callback `fn(el, i)`.
   *
   * @param {Function|String} fn
   * @return {Array}
   * @api public
   */

  oQuery.prototype.map = function(fn){
    var ret = []
      , callback = fn;

    if ('string' == typeof fn) {
      callback = function(el){ return el[fn](); };
    }

    this.each(function(el, i){
      ret.push(callback(el, i));
    });

    return ret;
  };

  /**
   * Select nodes with the given callback `fn(el, i)`.
   *
   * @param {Function} fn
   * @return {oQuery} new collection
   * @api public
   */

  oQuery.prototype.select = function(fn){
    var ret = new oQuery
      , callback = fn;

    this.each(function(el, i){
      if (callback(el, i)) ret.push(el);
    });

    return ret;
  };

  /**
   * Return immediate parent.
   *
   * @return {oQuery} new collection
   * @api public
   */

  oQuery.prototype.parent = function(){
    var el = this.get(0)
      , parent = el && el.parentNode;
    return parent
      ? oQuery(parent)
      : null;
  };

  /**
   * Toggle clicks with `on` and `off` callbacks.
   *
   * @param {Function} on
   * @param {Function} off
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.toggle = function(on, off){
    var self = this;
    return this.click(function(e){
      var fn = self.toggleState ? off : on;
      self.toggleState = ! self.toggleState;
      fn.call(this, e);
    });
  };

  /**
   * Listen to `event` and invoke `fn(event)`.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Type}
   * @api public
   */

  oQuery.prototype.on = function(event, fn){
    return this.addListener(event, fn).each(function(el){
      el.get(0).addEventListener(event, function(e){
        if (false === fn.call(el, e)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, false);
    });
  };

  /**
   * Register callback `fn` for `event`.
   *
   * @param {String} event
   * @param {String} fn
   * @return {oQuery} for chaining
   * @api public
   */

  oQuery.prototype.addListener = function(event, fn){
    this.getListeners(event).push(fn);
    return this;
  };

  /**
   * Return array of callbacks for `event`.
   *
   * @param {String} event
   * @return {Array}
   * @api public
   */

  oQuery.prototype.getListeners = function(event){
    return this.listeners[event] || (this.listeners[event] = []);
  };

  // shortcut event methods

  var events = ['click', 'change'];

  events.forEach(function(event){
    oQuery.prototype[event] = function(fn){
      return this.on(event, fn);
    };
  });

  /**
   * Return value for attribute `name`.
   *
   * @param {String} name
   * @return {String}
   * @api public
   */

  oQuery.prototype.html = function(name){
    return this.get(0)
      ? this.get(0).innerHTML
      : '';
  };

  /**
   * Return value for attribute `name`,
   * or set it to `val`.
   *
   * @param {String} name
   * @param {String} val
   * @return {String}
   * @api public
   */

  oQuery.prototype.attr = function(name, val){
    var el = this.get(0);
    if (2 == arguments.length) {
      if (el) el.setAttribute(name, val);
      return this;
    } else {
      return el
        ? el.getAttribute(name)
        : null;
    }
  };

  // shortcut attribute methods

  var attrs = [
      'id', 'action', 'method', 'alt', 'title'
    , 'enabled', 'checked', 'selected', 'width'
    , 'height', 'href', 'name', 'rel', 'rev'
    , 'src', 'type'];

  attrs.forEach(function(attr){
    oQuery.prototype[attr] = function(val){
      return 1 === arguments.length
        ? this.attr(attr, val)
        : this.attr(attr);
    };
  });

  return oQuery;

})();

// request

o.request = (function(){

  /**
   * Parse the given header `str` into
   * an object containing the mapped fields.
   *
   * @param {String} str
   * @return {Object}
   * @api private
   */

  function parseHeader(str) {
    var lines = str.split(/\r?\n/)
      , fields = {}
      , index
      , line
      , field
      , val;

    lines.pop(); // trailing CRLF

    for (var i = 0, len = lines.length; i < len; ++i) {
      line = lines[i];
      index = line.indexOf(':');
      field = line.slice(0, index).toLowerCase();
      val = line.slice(index + 1).trim();
      fields[field] = val;
    }

    return fields;
  }

  /**
   * Initialize a new `Request` with the
   * given HTTP `method` and `url`.
   *
   * @param {String} method
   * @param {String} url
   * @api private
   */

  function Request(method, url) {
    this.method = method;
    this.url = url;
    this.fields = {};
  }

  /**
   * Set header `field` to `val`.
   *
   * @param {String} field
   * @param {String} val
   * @return {Request} for chaining
   * @api public
   */

  Request.prototype.header = function(field, val){
    this.fields[field] = val;
    return this;
  };

  /**
   * Send the request, and callback `fn(res)`.
   *
   * @param {Function} fn
   * @return {Request} for chaining
   * @api public
   */

  Request.prototype.end = function(fn){
    // TODO: Response
    fn = fn || function(){};
    var xhr = new XMLHttpRequest
      , fields = this.fields;

    // state change
    xhr.onreadystatechange = function(){
      if (4 != xhr.readyState) return;
      var status = xhr.status;

      // parse header
      xhr.header = parseHeader(xhr.getAllResponseHeaders());

      // status classes
      xhr.success = xhr.status >= 200 && xhr.status < 300;
      xhr.redirect = xhr.status >= 300 && xhr.status < 400;
      xhr.error = xhr.status >= 400;

      // automated parser support
      var type = xhr.header['content-type']
        , type = type && type.split(';')[0]
        , parse = type && o.request[type];

      // expose that shit
      if (parse) xhr.body = xhr.data = parse(xhr.responseText);

      fn(xhr, xhr.body);
    };

    // send request
    xhr.open(this.method, this.url, true);

    for (var field in fields) {
      xhr.setRequestHeader(field, fields[field]);
    }

    xhr.send(null);
    return this;
  };

  /**
   * Public interface to `new Request()`.
   *
   * @param {String} method
   * @param {String} url
   * @return {Request}
   * @api public
   */

  function api(method, url){
    return new Request(method, url);
  }

  // default parsers

  api['application/json'] = JSON.parse;

  return api;

})();

// http method shortcuts

o.get = function(url, fn){ return o.request('GET', url).end(fn); };
o.post = function(url, fn){ return o.request('POST', url).end(fn); };
o.put = function(url, fn){ return o.request('PUT', url).end(fn); };
o.del = function(url, fn){ return o.request('DELETE', url).end(fn); };
