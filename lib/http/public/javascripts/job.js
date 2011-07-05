
/*!
 * kue - Job
 * Copyright (c) 2011 LearnBoost <tj@learnboost.com>
 * MIT Licensed
 */

/**
 * Initialize a new `Job` with the given `data`.
 *
 * @param {Object} obj
 */

function Job(data) {
  this.update(data);
}

/**
 * Return the job template html.
 *
 * @return {String}
 */

Job.prototype.template = function(){
  return o('#job-template').html();
};

/**
 * Show progress indicator.
 *
 * @param {Boolean} val
 * @return {Job} for chaining
 */

Job.prototype.showProgress = function(val){
  this._showProgress = val;
  return this;
};

/**
 * Show error message when `val` is true.
 *
 * @param {Boolean} val
 * @return {Job} for chaining
 */

Job.prototype.showErrorMessage = function(val){
  this._showError = val;
  return this;
};

/**
 * Remove the job and callback `fn()`.
 * 
 * @param {Function} fn
 */

Job.prototype.remove = function(fn){
  request('DELETE', '/job/' + this.id, fn);
  return this;
};

/**
 * Update the job with the given `data`.
 *
 * @param {Object} data
 * @return {Job} for chaining
 */

Job.prototype.update = function(data){
  for (var key in data) this[key] = data[key];
  if (!this.data) this.data = {};
  return this;
};

/**
 * Render the job, returning an oQuery object.
 *
 * @param {Boolean} isNew
 * @return {oQuery}
 */

Job.prototype.render = function(isNew){
  var self = this
    , id = this.id
    , el = this.el
    , keys = Object.keys(this.data).sort()
    , data;

  if (isNew) {
    el = this.el = o(this.template());

    // progress indicator
    var canvas = el.find('canvas').get(0) 
      , ctx = this.ctx = canvas.getContext('2d')
      , progress = new Progress;

    progress.size(canvas.width);
    this._progress = progress;

    // initially hide the logs
    el.find('.log').hide();

    // populate title and id
    el.attr('id', 'job-' + id);
    el.find('h2').text(id);

    // remove button
    el.find('.remove').click(function(){
      el.remove();
      self.remove();
    });

    // show job data
    for (var i = 0, len = keys.length; i < len; ++i) {
      data = this.data[keys[i]];
      if ('object' == typeof data) data = JSON.stringify(data);
      el.find('.details table tbody')
        .prepend(o('<tr><td>%s:</td><td>%s</td></tr>', keys[i], data));
    }

    // alter state
    el.find('.state td:last-child').text(this.state).click(function(){
      var select = o('<select>%s</select>', options(states, self.state));
      o(this).replaceWith(select);
      select.change(function(){
        el.remove();
        self.updateState(select.val());
      });
      return false;
    });

    // alter priority
    el.find('.priority td:last-child').text(priority(this)).click(function(){
      var select = o('<select>%s</select>', options(priorities, self.priority))
      o(this).replaceWith(select);
      select.change(function(){
        self.updatePriority(select.val());
      });
      return false;
    });


    // show details
    el.toggle(function(){
      el.find('.details').addClass('show');
      self.showDetails = true;
    }, function(){
      el.find('.details').removeClass('show');
      self.showDetails = false;
    });
  }

  this.renderUpdate();

  return el;
};

/**
 * Update this jobs state to `state`.
 *
 * @param {String} state
 */

Job.prototype.updateState = function(state){
  request('PUT', '/job/' + this.id + '/state/' + state);
};

/**
 * Update this jobs priority to `n`.
 *
 * @param {Number} n
 */

Job.prototype.updatePriority = function(n){
  request('PUT', '/job/' + this.id + '/priority/' + n);
};

/**
 * Update the job view.
 */

Job.prototype.renderUpdate = function(){
  // TODO: templates
  var el = this.el
    , showError = this._showError
    , showProgress = this._showProgress;

  // type
  el.find('.type td:last-child').text(this.type);

  // errors
  if (showError && this.error) {
    el.find('.error td:last-child').text(this.error.split('\n')[0]);
  } else {
    el.find('.error').remove();
  }

  // attempts
  if (this.attempts) {
    el.find('.attempts').text(this.attempts);
  } else {
    el.find('.attempts').remove();
  }

  // title
  el.find('.title td:last-child').text(this.data.title
    ? this.data.title
    : 'untitled');

  // details
  this.renderTimestamp('created_at');
  this.renderTimestamp('updated_at');
  this.renderTimestamp('failed_at');

  // inactive
  if ('inactive' == this.state) el.find('.log').remove();

  // completion
  if ('complete' == this.state) {
    el.find('.duration td:last-child').text(relative(this.duration));
    el.find('.updated_at td:first-child').text('Completed: ');
    el.find('.priority').hide();
  } else {
    el.find('.duration').remove();
  }

  // error
  if ('failed' == this.state) {
    el.find('.details .error pre').show().text(this.error);
  } else {
    el.find('.details .error').hide();
  }

  // progress indicator
  if (showProgress) this._progress.update(this.progress).draw(this.ctx);

  // logs
  if (this.showDetails) {
    request('GET', '/job/' + this.id + '/log', function(log){
      var ul = el.find('.log').show().find('ul');
      ul.find('li').remove();
      log.forEach(function(line){
        ul.append(o('<li>%s</li>', line));
      });
    });
  }
};

/**
 * Render timestamp for the given `prop`.
 *
 * @param {String} prop
 */

Job.prototype.renderTimestamp = function(prop){
  var val = this[prop]
    , tr = this.el.find('.' + prop);

  if (val) {
    tr.find('td:last-child').text(relative(Date.now() - val) + ' ago');
  } else {
    tr.remove();
  }
};
