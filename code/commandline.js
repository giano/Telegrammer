"use strict";

const config = require('./config');
const _ = require('underscore');
const s = require("underscore.string");
const escape_string_regexp = require('escape-string-regexp');

_.mixin(s.exports());

var api = null;

const Promise = require('promise');

let cm_hooks = {};

const commandline_service = {
  get_hooks: function () {
    return cm_hooks;
  },

  execute: function (command, params) {
    params = params || {};
    command = command.toLowerCase();

    if (!api.is_hooked()) {
      let error = new Error("Telegram service not hooked. Send first message.");
      return Promise.reject(error);
    }

    if (cm_hooks[command]) {
      let command_hook = cm_hooks[command];
      if (command_hook.exec) {
        if (_.isFunction(command_hook.exec)) {
          return command_hook.exec(params, api);
        } else if (_.isString(command_hook.exec)) {
          let out_str = command_hook.exec;
          for (var key in params) {
            if (params.hasOwnProperty(key)) {
              let regsrc = new RegExp(`@${escape_string_regexp(hook_def.match)}@`, "img");
              out_str = out_str.replace(key, params[key]);
            }
          }
          return api.send(out_str);
        } else {
          let error = new Error("Command not implemented.");
          return Promise.reject(error);
        }
      } else {
        let error = new Error("Command not implemented.");
        return Promise.reject(error);
      }
    } else {
      let error = new Error("Command not found.");
      return Promise.reject(error);
    }
  },

  init: function (params) {
    let promise = new Promise(function (resolve, reject) {
      if (config.get("commandline:active") == false) {
        return resolve(false);
      }
      api = params.api;
      let hooks = params.hooks;

      cm_hooks = _.indexBy(hooks.filter(function (el) {
        return el.has_command_line_hook
      }), "cmd_name");

      process.nextTick(function () {
        resolve(true);
      })
    });

    return promise;
  }
}

module.exports = commandline_service;
