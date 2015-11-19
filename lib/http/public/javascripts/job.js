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
 * Show progress indicator.
 *
 * @param {Boolean} val
 * @return {Job} for chaining
 */

Job.prototype.showProgress = function (val) {
    this._showProgress = val;
    return this;
};

/**
 * Show error message when `val` is true.
 *
 * @param {Boolean} val
 * @return {Job} for chaining
 */

Job.prototype.showErrorMessage = function (val) {
    this._showError = val;
    return this;
};

/**
 * Remove the job and callback `fn()`.
 *
 * @param {Function} fn
 */

Job.prototype.remove = function (fn) {
    request('DELETE', './job/' + this.id, fn);
    return this;
};

/**
 * Restart the job and callback `fn()`.
 *
 * @param {Function} fn
 */

Job.prototype.restart = function (fn) {
    request('GET', './inactive/' + this.id, fn);
    return this;
};

/**
 * Update the job with the given `data`.
 *
 * @param {Object} data
 * @return {Job} for chaining
 */

Job.prototype.update = function (data) {
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

Job.prototype.render = function (isNew) {
    var self = this
        , id = this.id
        , view = this.view
        , keys = Object.keys(this.data).sort()
        , data;

    if (isNew) {
        view = this.view = View('job');

        view.remove(function () {
            this.remove();
            self.remove();
        });

        view.restart(function () {
            this.restart();
            self.restart();
        });

        var canvas = view.progress
            , ctx = this.ctx = canvas.getContext('2d')
            , progress = new Progress;

        progress.size(canvas.width);
        this._progress = progress;

        // initially hide the logs
        view.log.hide();

        // populate title and id
        view.el.attr('id', 'job-' + id);
        view.id(id);

        // show job data
        for (var i = 0, len = keys.length; i < len; ++i) {
            data = this.data[keys[i]];
            if ('object' == typeof data) data = JSON.stringify(data);
            var row = View('row');
//            row.title(keys[i] + ':').value(data);
            row.title(keys[i] + ':').value($('<p></p>').text(data).html());
            view.data.add(row);
        }

        // alter state
        view.state(this.state);
        view.state().click(function () {
            var select = o('<select>%s</select>', options(states, self.state));
            o(this).replaceWith(select);
            select.change(function () {
                self.updateState(select.val());
            });
            return false;
        });

        // alter priority
        view.priority(priority(this));
        view.priority().click(function () {
            var select = o('<select>%s</select>', options(priorities, self.priority));
            o(this).replaceWith(select);
            select.change(function () {
                self.updatePriority(select.val());
            })
            return false;
        });

        // show details
        view.el.find('.contents').toggle(function () {
            view.details().addClass('show');
            self.showDetails = true;
        }, function () {
            view.details().removeClass('show');
            self.showDetails = false;
        });
    }

    this.renderUpdate();

    return view.el;
};

/**
 * Update this jobs state to `state`.
 *
 * @param {String} state
 */

Job.prototype.updateState = function (state) {
    request('PUT', './job/' + this.id + '/state/' + state);
};

/**
 * Update this jobs priority to `n`.
 *
 * @param {Number} n
 */

Job.prototype.updatePriority = function (n) {
    request('PUT', './job/' + this.id + '/priority/' + n);
};

/**
 * Update the job view.
 */

Job.prototype.renderUpdate = function () {
    // TODO: templates
    var view = this.view
        , showError = this._showError
        , showProgress = this._showProgress;

    // type
    view.type(this.type);

    // errors
    if (showError && this.error) {
        view.errorMessage(this.error.split('\n')[0]);
    } else {
        view.errorMessage().remove();
    }

    // attempts
    if (this.attempts.made) {
        view.attempts(this.attempts.made + '/' + this.attempts.max);
    } else {
        view.attempts().parent().remove();
    }

    // title
    view.title(this.data.title
        ? this.data.title
        : 'untitled');

    // details
    this.renderTimestamp('created_at');
    this.renderTimestamp('updated_at');
    this.renderTimestamp('failed_at');

    // delayed
    if ('delayed' == this.state) {
        var delay = parseInt(this.delay, 10)
            , creation = parseInt(this.created_at, 10)
            , remaining = relative(creation + delay - Date.now());
        view.title((this.data.title || '') + ' <em>( ' + remaining + ' )</em>');
    }

    // inactive
    if ('inactive' == this.state) view.log.remove();

    // completion
    if ('complete' == this.state) {
        view.duration(relative(this.duration));
        view.updated_at().prev().text('Completed: ');
        view.priority().parent().hide();
    } else {
        view.duration().parent().remove();
    }

    // error
    if ('failed' == this.state) {
        view.error().show().find('pre').text(this.error);
    } else {
        view.error().hide();
    }

    // progress indicator
    if (showProgress) this._progress.update(this.progress).draw(this.ctx);

    // logs
    if (this.showDetails) {
        request('GET', './job/' + this.id + '/log', function (log) {
            var ul = view.log.show();
            
            // return early if log hasnt changed
            if (ul.text() === log) return;
            
            ul.find('li').remove();
            log.forEach(function (line) {
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

Job.prototype.renderTimestamp = function (prop) {
    var val = this[prop]
        , view = this.view;

    if (val) {
        view[prop]().text(relative(Date.now() - val) + ' ago');
    } else {
        view[prop]().parent().remove();
    }
};
