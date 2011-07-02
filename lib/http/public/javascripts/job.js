
/*!
 * q - Job
 * Copyright (c) 2010 LearnBoost <tj@learnboost.com>
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
    , el = this.el;

  if (isNew) {
    el = this.el = o(this.template());

    // progress indicator
    var canvas = el.find('canvas').get(0) 
      , ctx = this.ctx = canvas.getContext('2d')
      , progress = new Progress;

    progress.size(canvas.width);
    this._progress = progress;

    // populate title and id
    el.id('job-' + id);
    el.find('h2').text(id);

    // remove button
    el.find('.remove').click(function(){
      self.remove(function(){
        el.remove();
      });
    });

    // show details
    el.toggle(function(){
      el.find('.details').addClass('show');
      self.updateDetails = true;
    }, function(){
      el.find('.details').removeClass('show');
      self.updateDetails = false;
    });
  }

  this.renderUpdate();

  return el;
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

  // completion
  if ('complete' == this.state) {
    el.find('.duration td:last-child').text(relative(this.duration));
    el.find('.updated_at td:first-child').text('Completed: ');
  } else {
    el.find('.duration').remove();
  }

  // progress indicator
  if (showProgress) this._progress.update(this.progress).draw(this.ctx);
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
