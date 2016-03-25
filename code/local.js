"use strict";

const hooks = require('./hooks');
const config = require('./config');
const logger = require('./logger');
const path = require('path');
const _ = require('underscore');
const s = require("underscore.string");
const asyncP = require('async-promises');
_.mixin(s.exports());

let api = null;
let hooks_dir = hooks.get_hooks_dir();
let initialized = false;

let manage_response = function (message, hook_def, error, output, plain) {
  let error_msg = hook_def.error || "@error@";
  let response_msg = (_.isString(hook_def.response) ? hook_def.response : null) || "@response@";

  return new Promise(function (resolve, reject) {
    if (hook_def.response === false) {
      return resolve();
    }

    if (_.isFunction(hook_def.response)) {
      return hook_def.response(message, error, output).then(function () {
        output = output || "";
        if (!output) {
          return resolve();
        }
        api.respond(message, output, plain).then(resolve).catch(reject);
      }).catch(function (error) {
        api.respond(message, (error.message || error), plain).then(resolve).catch(reject);
      });
    } else {
      if (error) {
        if (hook_def.error !== false) {
          api.respond(message, error_msg.replace(/@error@/mi, (error.message || error)), plain).then(resolve).catch(reject);
        } else {
          reject(error.message || error);
        }
      } else {
        output = output || "";
        api.respond(message, response_msg.replace(/@response@/mi, output), plain).then(resolve).catch(reject);
      }
    }
  });
};

const local_service = {
  connect_hook: function (hook_def) {
    return new Promise(function (resolve, reject) {

      hook_def.action_type = _.isString(hook_def.action) ? "string" : "function";

      if (_.isArray(hook_def.signal)) {
        hook_def.action = function (message, service, matches) {
          return new Promise(function (resolve, reject) {
            try {
              const Gpio = require('onoff').Gpio;
            } catch (e) {
              return reject(e);
            }
            let gpios = _.uniq(_.pluck(hook_def.signal, "gpio"));
            let gpios_map = {};
            _.each(gpios, function (gpio) {
              gpios_map[gpio] = new Gpio(gpio, 'out');
            });

            asyncP.each(hook_def.signal, function (gpio_el) {
              return new Promise(function (resolve, reject) {
                gpios_map[gpio_el.gpio].write(((_.isNull(gpio_el.value) || _.isUndefined(gpio_el.value)) ? 1 : (!!gpio_el.value) * 1), function (err) {
                  if (err) {
                    return reject(err);
                  }
                  if (gpio_el.time) {
                    setTimeout(resolve, gpio_el.time);
                  } else {
                    resolve();
                  }
                });
              });
            }).than(function () {
              _.each(gpios, function (gpio) {
                gpios_map[gpio] = new Gpio(gpio, 'out');
              });
              resolve("");
            });
          });
        };
      } else if (_.isFunction(hook_def.signal)) {
        hook_def.action = hook_def.signal;
      }

      if (_.isString(hook_def.shell)) {
        let path_to_script = path.resolve(hooks_dir, path.dirname(hook_def.path), ".", hook_def.shell);
        hook_def.action = `"${path_to_script}"`;
      }

      if (_.isString(hook_def.action)) {
        hook_def._action = hook_def.action;

        let action_fn = _.bind(function (message, service, matches) {
          return new Promise(function (resolve, reject) {
            const exec = require('child_process').exec;
            matches = matches || [];
            let result_command = hook_def._action;

            for (let i = 0; i < matches.length; i++) {
              let placeholder = new RegExp(`@${i}@`, 'mgi');
              result_command = result_command.replace(placeholder, matches[i]);
            }

            let options = {};

            if (config.get('shell')) {
              options.shell = config.get('shell');
            }

            let child = exec(result_command, options, function (error, stdout, stderr) {

              let error_msg = hook_def.error || "Error: @error@";
              let has_error = false;

              if (error) return reject(error, null);

              let stderr_str = stderr.toString('utf8');
              let stdout_str = stdout.toString('utf8');

              if (stderr_str) return reject(new Error(stderr_str));

              if (hook_def.check) {
                if (_.isString(hook_def.check)) {
                  has_error = hook_def.check.toLowerCase() != stdout_str.toLowerCase();
                } else if (_.isFunction(hook_def.check)) {
                  has_error = !hook_def.check(message, stdout_str);
                } else if (_.isRegExp(hook_def.check)) {
                  has_error = !hook_def.check.test(stdout_str);
                }
              }

              if (has_error) {
                reject(new Error(stdout_str));
              } else if (hook_def.response !== false) {
                resolve(stdout_str);
              }

            });
          });
        }, hook_def);

        hook_def.action = action_fn;
      }
      if (!_.isFunction(hook_def.action) && _.isFunction(hook_def.parse_response)) {
        hook_def.action = function () {
          return Promise.resolve();
        };
      }

      if (_.isFunction(hook_def.action)) {
        let _action = _.bind(hook_def.action, hook_def);

        hook_def.action = _.bind(function (message, service, matches) {
          return new Promise(function (resolve, reject) {
            if (hook_def.confirmation || hook_def.buttons) {

              let confirm_message = _.isString(hook_def.confirmation) ? hook_def.confirmation : "Are you sure?";

              let buttons = hook_def.buttons || (_.isBoolean(hook_def.confirmation) ? [
                ["Yes", "No"]
              ] : true);

              let parse_response = _.isFunction(hook_def.parse_response) ? function (response_message) {
                hook_def.parse_response(message, response_message, api).then(resolve).catch(reject);
              } : function (response_message) {
                let response_text = response_message.text.toString().toLowerCase();
                if (response_text == "yes") {
                  return _action(message, service, matches).then(function (output, plain) {
                    manage_response(message, hook_def, null, output, (hook_def.plain || plain)).then(resolve).catch(reject);
                  }).catch(function (error) {
                    manage_response(message, hook_def, error, null, hook_def.plain).then(resolve).catch(reject);
                  });
                } else {
                  manage_response(message, hook_def, (hook_def.abort || "Ok, nevermind..."), null, hook_def.plain).then(resolve).catch(reject);
                }
              };
              return api.send(confirm_message, buttons, (hook_def.accepted_responses || true), hook_def.one_time_keyboard, hook_def.plain).then(parse_response).catch(reject);
            } else {
              return _action(message, service, matches).then(function (output, plain) {
                manage_response(message, hook_def, null, output, (hook_def.plain || plain)).then(resolve).catch(reject);
              }).catch(function (error) {
                manage_response(message, hook_def, error, null, hook_def.plain).then(resolve).catch(reject);
              });
            }
          });
        }, hook_def);
      }

      return api.register_message_hook(hook_def).then(resolve).catch(reject);
    });
  },

  init: function (tapi) {
    api = tapi;

    return new Promise(function (resolve, reject) {

      hooks.load().then(function () {

        if (config.get("local:active") == false) {
          return resolve(api);
        }

        var lo_hooks = hooks.get_hooks("has_local_hook", "full_name");
        var promises = [];

        for (let monitor_name in lo_hooks) {
          let hook = lo_hooks[monitor_name];
          promises.push(local_service.connect_hook(hook));
        }

        if (promises.length) {
          Promise.all(promises).then(function () {
            initialized = true;
            resolve(api);
          }).catch(reject);
        } else {
          process.nextTick(function () {
            initialized = true;
            resolve(api);
          });
        }
      }).catch(reject);
    });
  }
}

module.exports = local_service;
