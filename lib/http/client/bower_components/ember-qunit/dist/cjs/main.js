"use strict";
var Ember = require("ember")["default"] || require("ember");
var isolatedContainer = require("./isolated-container")["default"] || require("./isolated-container");
var moduleFor = require("./module-for")["default"] || require("./module-for");
var moduleForComponent = require("./module-for-component")["default"] || require("./module-for-component");
var moduleForModel = require("./module-for-model")["default"] || require("./module-for-model");
var test = require("./test")["default"] || require("./test");
var testResolver = require("./test-resolver")["default"] || require("./test-resolver");

Ember.testing = true;

function setResolver(resolver) {
  testResolver.set(resolver);
}

function globalize() {
  window.moduleFor = moduleFor;
  window.moduleForComponent = moduleForComponent;
  window.moduleForModel = moduleForModel;
  window.test = test;
  window.setResolver = setResolver;
}

exports.globalize = globalize;
exports.moduleFor = moduleFor;
exports.moduleForComponent = moduleForComponent;
exports.moduleForModel = moduleForModel;
exports.test = test;
exports.setResolver = setResolver;