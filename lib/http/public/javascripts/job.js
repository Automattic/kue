
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
}

Job.prototype.render = function(){
  // var el, ctx, progress, canvas;
  // if (!job) return;
  // 
  // if ($('#job-' + job.id).length) {
  //   el = $('#job-' + job.id);
  // } else {
  //   el = $(tmpl);
  //   el.attr('id', 'job-' + job.id);
  //   el.find('h2').text(job.id);
  //   el.appendTo('#content');
  //   job.isNew = true;
  // }
  // 
  // if (job.error && 'failed' == active) {
  //   el.find('.error td:last-child').text(job.error.split('\n')[0]);
  // } else {
  //   el.find('.error').remove();
  // }
  // 
  // if (job.attempts) {
  //   el.find('.attempts').text(job.attempts);
  // } else {
  //   el.find('.attempts').remove();
  // }
  // 
  // el.find('.title td:last-child').text(job.data.title
  //   ? job.data.title
  //   : 'untitled');
  // 
  // el.find('a.view').attr('href', '/job/' + job.id);
  // 
  // el.find('.type td:last-child').text(job.type);
  // 
  // if ('active' == state) {
  //   canvas = el.find('canvas').get(0);
  //   ctx = canvas.getContext('2d');
  //   progress = new Progress;
  //   progress
  //     .size(canvas.width)
  //     .update(job.progress)
  //     .draw(ctx);
  // }
  // 
  // if (!job.isNew) return;
  // 
  // el.click(function(){
  //   console.log('show details');
  // });
  // 
  // el.find('a.remove').click(function(){
  //   removeJob(job.id, function(){
  //     el.remove();
  //   });
  // });
};
