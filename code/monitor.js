"use strict";

const config = require('./config');
const _ = require('underscore');
const s = require("underscore.string");
const escape_string_regexp = require('escape-string-regexp');

_.mixin(s.exports());

var api = null;

const Promise = require('promise');

let initialized = false;
let mo_hooks = {};

const monitor_service = {
  get_hooks: function () {
    return mo_hooks;
  },

  start: function (hook_or_name) {
    if (_.isString(hook_or_name)) {
      return monitor_service.start(mo_hooks[hook_or_name]);
    } else {
      logger.notify(`Starting monitor hook ${hook.full_name}...`);
      if (_.isFunction(hook.start_monitor)) {
        return hook.start_monitor(hook, api).then(function(arg){
          logger.log(`Monitor hook ${hook.full_name} started.`);
          return Promise.accept(arg);
        });
      } else if (_.isFunction(hook.check)) {
        let check = _.bind(hook.check, hook);
        if (mo_hooks[hook.full_name]) {
          clearInterval(mo_hooks[hook.full_name]);
        }
        mo_hooks[hook.full_name] = setInterval(check, hook.interval || 5000);
        logger.notify(`Monitor hook ${hook.full_name} started.`);
        return Promise.accept(true);
      } else {
        return Promise.reject(new Error("Need 'start_monitor' or 'check' functions."));
      }
    }
  },

  restart: function (hook_or_name) {
    return monitor_service.stop(hook_or_name).finally(function () {
      return monitor_service.start(hook_or_name);
    });
  },

  stop: function (hook_or_name) {
    if (_.isString(hook_or_name)) {
      return monitor_service.stop(mo_hooks[hook_or_name]);
    } else {
      logger.notify(`Stopping monitor hook ${hook.full_name}`);
      if (_.isFunction(hook.stop_monitor)) {
        return hook.stop_monitor(hook, api).then(function(arg){
          logger.log(`Monitor hook ${hook.full_name} stopped.`);
          return Promise.accept(arg);
        });
      } else if (_.isFunction(hook.check)) {
        if (mo_hooks[hook.full_name]) {
          clearInterval(mo_hooks[hook.full_name]);
        }
        logger.log(`Monitor hook ${hook.full_name} stopped.`);
        return Promise.accept(true);
      } else {
        return Promise.reject(new Error("Need 'start_monitor' or 'check' functions."));
      }
    }
  },

  init: function (params) {
    let promise = new Promise(function (resolve, reject) {
      api = params.api;
      let hooks = params.hooks;

      if (config.get("monitor:active") == false) {
        return resolve({
          api: api,
          hooks: hooks
        });
      }

      mo_hooks = _.indexBy(hooks.filter(function (el) {
        return el.has_monitor_hook
      }), "full_name");

      let promises = [];

      for (let monitor_name in mo_hooks) {
        let hook = mo_hooks[monitor_name];
        if(hook.autostart){
          promises.push(monitor_service.start(hook));
        }
      }

      if(promises.length){
        Promise.all(promises).then(function(){
          initialized = true;
          resolve({
            api: api,
            hooks: hooks
          });
        }).catch(reject);
      }else{
        process.nextTick(function () {
          initialized = true;
          resolve({
            api: api,
            hooks: hooks
          });
        });
      }
    });

    return promise;
  }
}

module.exports = monitor_service;
