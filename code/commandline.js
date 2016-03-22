"use strict";


const hooks = require('./hooks');
const config = require('./config');
const _ = require('underscore');
const s = require("underscore.string");
const escape_string_regexp = require('escape-string-regexp');

_.mixin(s.exports());

var api = null;

const Promise = require('promise');

var initialized = false;

const commandline_service = {
  execute: function (command, params) {
    var promise = new Promise(function (resolve, reject) {

      hooks.load().then(function () {
        var cm_hooks = hooks.get_hooks("has_command_line_hook", "cmd_name");

        params = params || {};
        command = command.toLowerCase();

        if (!api.is_hooked()) {
          var error = new Error("Telegram service not hooked. Send first message.");
          return reject(error);
        }

        if (cm_hooks[command]) {
          var command_hook = cm_hooks[command];
          if (command_hook.exec) {
            if (_.isFunction(command_hook.exec)) {
              return command_hook.exec(params, api);
            } else if (_.isString(command_hook.exec)) {
              var out_str = command_hook.exec;

              for (let key in params) {
                if (params.hasOwnProperty(key)) {
                  let regsrc = new RegExp(`@${escape_string_regexp(hook_def.match)}@`, "img");
                  out_str = out_str.replace(key, params[key]);
                }
              }

              return api.send(out_str);
            } else {
              let error = new Error("Command not implemented.");
              return reject(error);
            }
          } else {
            let error = new Error("Command not implemented.");
            return reject(error);
          }
        } else {
          let error = new Error("Command not found.");
          return reject(error);
        }
      }).catch(reject);

    });

    return promise;
  },

  init: function (tapi) {
    api = tapi;

    let promise = new Promise(function (resolve, reject) {
      if (config.get("commandline:active") == false) {
        initialized = true;
        return resolve(api);
      }

      process.nextTick(function () {
        initialized = true;
        resolve(api);
      });

    });

    return promise;
  }
}

module.exports = commandline_service;
