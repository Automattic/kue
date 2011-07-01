
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
  for (var key in data) this[key] = data[key];
  if (!this.data) this.data = {};
}

/**
 * Return the job template html.
 *
 * @return {String}
 */

Job.prototype.template = function(){
  return tmpl = o('#job-template').html();
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
 * Render the job, returning a jQuery object.
 *
 * @return {jQuery}
 */

Job.prototype.render = function(){
  var self = this
    , id = this.id
    , showError = this._showError
    , el;

  // grab / create initial element
  el = this.el = o('#job-' + this.id).length()
    ? o('#job-' + this.id)
    : o(this.template());

  el.id('job-' + id);
  el.find('h2').text(id);

  // type
  el.find('.type td:last-child').text(this.type);

  // errors
  if (showError && this.error) {
    el.find('.error td:last-child').text(this.error.split('\n')[0]);
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

  // timestamps
  // TODO: only in details
  el.find('.created_at').text('created ' + relative(Date.now() - this.created_at));
  el.find('.updated_at').text('updated ' + relative(Date.now() - this.updated_at));
  el.find('.failed_at').text('failed ' + relative(Date.now() - this.failed_at));

  // remove button
  el.find('.remove').click(function(){
    self.remove(function(){
      el.remove();
    });
  });

  // progress indicator
  if (this._showProgress) this.renderProgress();

  // el.click(function(){
  //   console.log('show details');
  // });

  return el;
};

/**
 * Render job progress.
 *
 * @return {Job} for chaining
 */

Job.prototype.renderProgress = function(){
  var el = this.el
    , canvas = el.find('canvas').get(0) 
    , ctx = canvas.getContext('2d')
    , progress = new Progress;

  progress
    .size(canvas.width)
    .update(this.progress)
    .draw(ctx);

  return this;
};
