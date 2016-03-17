"use strict";

const config = require('./config');
const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

var api = null;

const Promise = require('promise');

let cm_hooks = {};

const commandline_service = {
  get_hooks: function(){
    return cm_hooks;
  },

  execute: function (command, params, cb) {
    command = command.toLowerCase();

    if (!api.is_hooked()) {
      return cb("Telegram service not hooked. Send first message.", null);
    }

    if (cm_hooks[command]) {
      let command_hook = cm_hooks[command];
      if (command_hook.exec) {
        command_hook.exec(params, api, cb);
      } else {
        cb("Command not implemented", null);
      }
    } else {
      cb("Command not found", null);
    }
  },

  init: function (params) {
    let promise = new Promise(function (resolve, reject) {
      if(config.get("commandline:active") == false){
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
