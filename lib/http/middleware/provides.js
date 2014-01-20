/**
 * Specify that the route provides `type`.
 *
 * @param {String} type
 * @return {Function}
 * @api private
 */

module.exports = function (type) {
    return function (req, res, next) {
        if (req.accepts(type)) return next();
        next('route');
    }
};