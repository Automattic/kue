
/*!
 * EventEmitter
 * Copyright (c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * EventEmitter.
 */

function EventEmitter() {
  this.callbacks = {};
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 */

EventEmitter.prototype.on = function(event, fn){
  (this.callbacks[event] = this.callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 */

EventEmitter.prototype.emit = function(event){
  var args = Array.prototype.slice.call(arguments, 1)
    , callbacks = this.callbacks[event];

  if (callbacks) {
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args)
    }
  }

  return this;
};

/*!
 * caustic
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

// TODO: `make caustic.js` should wrap in an anonymous function
// TODO: `make caustic.min.js`

// TODO: compile sub-views such as User etc based on the given
// html, as there's no need to keep traversing each time.

/**
 * Convert callback `fn` to a function when a string is given.
 *
 * @param {Type} name
 * @return {Type}
 * @api private
 */

function callback(fn) {
  return 'string' == typeof fn
    ? function(obj){ return obj[fn](); }
    : fn;
}

/**
 * Initialize a new view with the given `name`
 * or string of html. When a `name` is given an element
 * with the id `name + "-template"` will be used.
 *
 * Examples:
 *
 *    var user = new View('user');
 *    var list = new View('<ul class="list"><li></li></ul>');
 *
 * @param {String} name
 * @api public
 */

function View(name) {
  if (!(this instanceof View)) return new View(name);
  EventEmitter.call(this);
  var html;
  if (~name.indexOf('<')) html = name;
  else html = $('#' + name + '-template').html(); 
  this.el = $(html);
  this.visit(this.el);
}

/**
 * Inherit from `EventEmitter.prototype`.
 */

View.prototype.__proto__ = EventEmitter.prototype;

/**
 * Visit `el`.
 *
 * @param {jQuery} el
 * @param {Boolean} ignore
 * @api private
 */

View.prototype.visit = function(el, ignore){
  var self = this
    , type = el.get(0).nodeName
    , classes = el.attr('class').split(/ +/)
    , method = 'visit' + type;

  if (this[method] && !ignore) this[method](el, classes[0]);

  el.children().each(function(i, el){
    self.visit($(el));
  });
};

/**
 * Visit INPUT tag.
 *
 * @param {jQuery} el
 * @api public
 */

View.prototype.visitINPUT = function(el){
  var self = this
    , name = el.attr('name')
    , type = el.attr('type');

  switch (type) {
    case 'text':
      this[name] = function(val){
        if (0 == arguments.length) return el.val();
        el.val(val);
        return this;
      }

      this[name].isEmpty = function(){
        return '' == el.val();
      };

      this[name].clear = function(){
        el.val('');
        return self;
      };
      break;
    case 'checkbox':
      this[name] = function(val){
        if (0 == arguments.length) return el.attr('checked');
        switch (typeof val) {
          case 'function':
            el.change(function(e){
              val.call(self, el.attr('checked'), e);
            });
            break;
          default:
            el.attr('checked', val
              ? 'checked'
              : val);
        }
        return this;
      }
      break;
  }
};

/**
 * Visit FORM.
 *
 * @param {jQuery} el
 * @api private
 */

View.prototype.visitFORM = function(el, name){
  var self = this;
  this.submit = function(val){
    switch (typeof val) {
      case 'function':
        el.submit(function(e){
          val.call(self, e, el);
          return false;
        });
        break;
    }
  }
};

/**
 * Visit A tag.
 *
 * @param {jQuery} el
 * @api private
 */

View.prototype.visitA = function(el, name){
  var self = this;

  el.click(function(e){
    self.emit(name, e, el);
  });

  this[name] = function(fn){
    el.click(function(e){
      fn.call(self, e, el);
      return false;
    });
    return this;
  }
};

/**
 * Visit P, TD, SPAN, or DIV tag.
 *
 * @param {jQuery} el
 * @api private
 */

View.prototype.visitP =
View.prototype.visitTD =
View.prototype.visitSPAN =
View.prototype.visitDIV = function(el, name){
  var self = this;
  this[name] = function(val){
    if (0 == arguments.length) return el;
    el.empty().append(val.el || val);
    return this;
  };
};

/**
 * Visit UL tag.
 *
 * @param {jQuery} el
 * @api private
 */

View.prototype.visitUL = function(el, name){
  var self = this;
  this.children = [];

  this[name] = el;

  // TODO: move these out

  /**
   * Add `val` to this list.
   *
   * @param {String|jQuery|View} val
   * @return {View} for chaining
   * @api public
   */

  el.add = function(val){
    var li = $('<li>');
    self.children.push(val);
    el.append(li.append(val.el || val));
    return this;
  };

  /**
   * Return the list item `View`s as an array.
   *
   * @return {Array} 
   * @api public
   */

  el.items = function(){
    return self.children;
  };

  /**
   * Iterate the list `View`s, calling `fn(item, i)`.
   *
   * @param {Function} fn
   * @return {View} for chaining
   * @api public
   */

  el.each = function(fn){
    for (var i = 0, len = self.children.length; i < len; ++i) {
      fn(self.children[i], i);
    }
    return this;
  };

  /**
   * Map the list `View`s, calling `fn(item, i)`.
   *
   * @param {String|function} fn
   * @return {Array}
   * @api public
   */

  el.map = function(fn){
    var ret = []
      , fn = callback(fn);

    for (var i = 0, len = self.children.length; i < len; ++i) {
      ret.push(fn(self.children[i], i));
    }

    return ret;
  };
};

/**
 * Visit TABLE.
 *
 * @param {jQuery} el
 * @api private
 */

View.prototype.visitTABLE = function(el, name){
  this[name] = el;

  this[name].add = function(val){
    this.append(val.el || val);
  };
};

/**
 * Visit CANVAS.
 *
 * @param {jQuery} el
 * @api private
 */

View.prototype.visitCANVAS = function(el, name){
  this[name] = el.get(0);
};

/**
 * Visit H1-H5 tags.
 *
 * @param {jQuery} el
 * @api private
 */

View.prototype.visitH1 =
View.prototype.visitH2 =
View.prototype.visitH3 =
View.prototype.visitH4 =
View.prototype.visitH5 = function(el, name){
  var self = this;
  this[name] = function(val){
    if (0 == arguments.length) return el.text();
    el.text(val.el || val);
    return this;
  };
};

/**
 * Remove the view from the DOM.
 *
 * @return {View}
 * @api public
 */

View.prototype.remove = function(){
  var parent = this.el.parent()
    , type = parent.get(0).nodeName;
  if ('LI' == type) parent.remove();
  else this.el.remove();
  return this;
};

/**
 * Append this view's element to `val`.
 *
 * @param {String|jQuery} val
 * @return {View}
 * @api public
 */

View.prototype.appendTo = function(val){
  this.el.appendTo(val.el || val);
  return this;
};
