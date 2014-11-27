/* jshint node: true */

module.exports = function(environment) {
  var ENV = {
    modulePrefix: 'client',
    environment: environment,
    baseURL: '/kue/',
    locationType: 'auto',
    EmberENV: {
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. 'with-controller': true
      }
    },

    APP: {
      // Here you can pass flags/options to your application instance
      // when it is created
    }
  };

  if (environment === 'development') {
    // ENV.APP.LOG_RESOLVER = true;
    ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    ENV.APP.LOG_VIEW_LOOKUPS = true;
    ENV.apiURL = 'http://localhost:3000'; // remove trailing slash
    ENV.contentSecurityPolicy = {
      'default-src': "'none' ",
      'script-src': "'self' 'unsafe-eval' http://localhost:3000",
      'font-src': "'self' https://fonts.gstatic.com",
      'connect-src': "'self' http://localhost:3000",
      'img-src': "'self'",
      'style-src': "'self' https://fonts.googleapis.com",
      'media-src': "'self'"
    }
  }


  if (environment === 'test') {
    // Testem prefers this...
    ENV.baseURL = '/';
    ENV.locationType = 'auto';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
  }

  if (environment === 'production') {
    ENV.apiURL = ENV.baseURL.slice(0, -1); // remove trailing slash
  }

  return ENV;
};
