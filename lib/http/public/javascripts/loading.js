/*!
 * kue - LoadingIndicator
 * Copyright (c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 */

/**
 * Initialize a new `LoadingIndicator`.
 */

function LoadingIndicator() {
    this.size(0);
    this.fontSize(9);
    this.font('helvetica, arial, sans-serif');
}

/**
 * Set size to `n`.
 *
 * @param {Number} n
 * @return {LoadingIndicator} for chaining
 * @api public
 */

LoadingIndicator.prototype.size = function (n) {
    this._size = n;
    return this;
};

/**
 * Set font size to `n`.
 *
 * @param {Number} n
 * @return {LoadingIndicator} for chaining
 * @api public
 */

LoadingIndicator.prototype.fontSize = function (n) {
    this._fontSize = n;
    return this;
};

/**
 * Set font `family`.
 *
 * @param {String} family
 * @return {LoadingIndicator} for chaining
 */

LoadingIndicator.prototype.font = function (family) {
    this._font = family;
    return this;
};

/**
 * Update pos to `n`.
 *
 * @param {Number} n
 * @return {LoadingIndicator} for chaining
 */

LoadingIndicator.prototype.update = function (n) {
    this.pos = n;
    return this;
};

/**
 * Draw on `ctx`.
 *
 * @param {CanvasRenderingContext2d} ctx
 * @return {LoadingIndicator} for chaining
 */

LoadingIndicator.prototype.draw = function (ctx) {
    var pos = this.pos % 360
        , size = this._size
        , half = size / 2
        , x = half
        , y = half
        , rad = half - 1
        , fontSize = this._fontSize;

    ctx.font = fontSize + 'px ' + this._font;

    ctx.clearRect(0, 0, size, size);

    // outer circle
    ctx.strokeStyle = '#9f9f9f';
    ctx.beginPath();
    ctx.arc(x, y, rad, pos, Math.PI / 2 + pos, false);
    ctx.stroke();

    // inner circle
    ctx.strokeStyle = '#eee';
    ctx.beginPath();
    ctx.arc(x, y, rad - 3, -pos, Math.PI / 2 - pos, false);
    ctx.stroke();

    // text
    var text = 'Loading'
        , w = ctx.measureText(text).width;

    ctx.fillText(
        text
        , x - w / 2 + 1
        , y + fontSize / 2 - 1);

    return this;
};
