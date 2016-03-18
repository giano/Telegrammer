"use strict";

const config = require('./config');
const _ = require('underscore');
const s = require("underscore.string");
const escape_string_regexp = require('escape-string-regexp');

_.mixin(s.exports());

var api = null;

const Promise = require('promise');

let mo_hooks = {};

const commandline_service = {
  get_hooks: function () {
    return mo_hooks;
  },

  init: function (params) {
    let promise = new Promise(function (resolve, reject) {
      if (config.get("monitor:active") == false) {
        return resolve(false);
      }

      api = params.api;
      let hooks = params.hooks;

      mo_hooks = _.indexBy(hooks.filter(function (el) {
        return el.has_monitor_hook
      }), "cmd_name");

      process.nextTick(function () {
        resolve(true);
      })
    });

    return promise;
  }
}

module.exports = commandline_service;
