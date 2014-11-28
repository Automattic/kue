define(
  ["exports"],
  function(__exports__) {
    "use strict";
    var __resolver__;

    function set(resolver) {
      __resolver__ = resolver;
    }

    __exports__.set = set;function get() {
      if (__resolver__ == null) throw new Error('you must set a resolver with `testResolver.set(resolver)`');
      return __resolver__;
    }

    __exports__.get = get;
  });