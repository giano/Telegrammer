"use strict";


const config = require('./config');
const logger = require('./logger');

const Promise = require('promise');
const escape_string_regexp = require('escape-string-regexp');
const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const path = require('path');
const dir = path.resolve(__dirname, '..');
const hooks_dir = path.resolve(dir, config.get('hooks:folder'));

let hooks_cache = [];

const work_hook = function (hook_def, hook_path) {
  if (hook_def) {
    if (_.isArray(hook_def)) {
      let out_array = _.map(hook_def, function (inner_hook_def) {
        return work_hook(inner_hook_def, hook_path);
      });
      return out_array;
    }

    if (((hook_def.match || hook_def.command) && (hook_def.action || hook_def.shell)) || (hook_def.route) || (hook_def.exec) || (hook_def.check) || (hook_def.start_monitor && hook_def.stop_monitor)) {
      hook_def.path = hook_path;
      hook_def.namespace = hook_def.namespace || path.dirname(hook_path) || 'default';
      hook_def.name = hook_def.name || path.basename(hook_path, path.extname(hook_path));
      hook_def.full_name = `${_.underscored(_.slugify(hook_def.namespace))}/${_.underscored(_.slugify(hook_def.name))}`;
      hook_def.route_path = hook_def.route ? (hook_def.route_path || _.replaceAll(hook_def.full_name.toLowerCase(), "_", "/")) : null;
      hook_def.cmd_name = hook_def.exec ? (hook_def.cmd_name || _.replaceAll(_.replaceAll(hook_def.full_name.toLowerCase(), "_", ":"), "/", ":")) : null;

      hook_def.has_monitor_hook = _.isFunction(hook_def.check) || (_.isFunction(hook_def.start_monitor) && _.isFunction(hook_def.stop_monitor));
      hook_def.has_telegram_hook = _.isString(hook_def.shell) || _.isFunction(hook_def.action) || _.isString(hook_def.action);
      hook_def.has_web_hook = _.isFunction(hook_def.route);
      hook_def.has_command_line_hook = _.isFunction(hook_def.exec) || _.isString(hook_def.exec);

      if (hook_def.command) {
        if (hook_def.command.indexOf('/') == -1) {
          hook_def.command = `/${hook_def.command}`;
        }
        hook_def.command = hook_def.command.toLowerCase();
        hook_def.match = new RegExp(`${escape_string_regexp(hook_def.command)}\s*(.*)`, 'i');
      }

      if (hook_def.match && _.isString(hook_def.match)) {
        hook_def.match = new RegExp(escape_string_regexp(hook_def.match), "im");
      }

      hook_def.action_type = _.isString(hook_def.action) ? "string" : "function";

      if (_.isString(hook_def.shell)){
        let path_to_script = path.resolve(hooks_dir, path.dirname(hook_path), ".", hook_def.shell);
        hook_def.action = `"${path_to_script}"`;
      }

      if (_.isString(hook_def.action)) {
        hook_def._action = hook_def.action;

        let action_fn = _.bind(function (message, service, matches) {
          let promise = new Promise(function (resolve, reject) {
            const exec = require('child_process').exec;
            matches = matches || [];
            let result_command = hook_def._action;

            for (let i = 0; i < matches.length; i++) {
              let placeholder = new RegExp(`@${i}@`, 'mgi');
              result_command = result_command.replace(placeholder, matches[i]);
            }
            let options = {};
            if(config.get('shell')){
              options.shell = config.get('shell');
            }

            let child = exec(result_command, options, function (error, stdout, stderr) {
              let error_msg = hook_def.error || "Error: @error@";
              let has_error = false;

              if (error) return reject(error, null);

              let stderr_str = stderr.toString('utf8');
              let stdout_str = stdout.toString('utf8');

              if (stderr_str) return cb(stderr_str, null);

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
          return promise;
        }, hook_def);

        hook_def.action = action_fn;
      }

      if (_.isFunction(hook_def.action)) {
        let _action = _.bind(hook_def.action, hook_def);

        hook_def.action = _.bind(function (message, service, matches) {
          let promise = new Promise(function (resolve, reject) {
            let error_msg = hook_def.error || "Error: @error@";
            let response_msg = (_.isString(hook_def.response) ? hook_def.response : null) || "@response@";

            let manage_response = function (error, output) {
              if (hook_def.response === false) {
                return resolve();
              }

              if (_.isFunction(hook_def.response)) {
                return hook_def.response(message, error, output).then(function () {
                  output = output || "";
                  if (!output) {
                    return resolve();
                  }
                  service.respond(message, output).then(resolve).catch(reject);
                }).catch(function (error) {
                  service.respond(message, (error.message || error)).then(resolve).catch(reject);
                });
              } else {
                if (error) {
                  if (hook_def.error !== false) {
                    service.respond(message, error_msg.replace(/@error@/mi, (error.message || error))).then(resolve).catch(reject);
                  } else {
                    reject(error.message || error);
                  }
                } else {
                  output = output || "";
                  service.respond(message, response_msg.replace(/@response@/mi, output)).then(resolve).catch(reject);
                }
              }
            };

            return _action(message, service, matches).then(function (output) {
              manage_response(null, output);
            }).catch(function (error) {
              manage_response(error);
            });
          });
          return promise;
        }, hook_def);
      }

      return hook_def;
    }
  }
  return false;
};


const hooks = {

  get_hooks: function (filter_by, group_by) {
    let out_val = hooks_cache;

    if (filter_by) {
      out_val = _.filter(out_val, function (hook) {
        return !!(hook[filter_by]);
      });
    }

    if (group_by) {
      out_val = _.indexBy(_.sortBy(out_val, group_by), group_by);
    }

    return out_val;
  },

  reload: function () {
    logger.log(`Reloading hooks`);
    hooks_cache = [];
    return hooks.load();
  },

  load: function () {
    if (hooks_cache.length > 0) {
      return Promise.resolve();
    }

    let promise = new Promise(function (resolve, reject) {

      const glob = require("glob");
      const options = {
        cwd: hooks_dir,
        root: hooks_dir
      };
      const hooks_pattern = `**/*.{js,json,coffee}`;
      glob(hooks_pattern, options, function (error, matches) {
        if (error) {
          return reject(error);
        }
        matches = matches || [];
        hooks_cache = _.compact(_.flatten(_.map(matches, function (hook_path) {
          let hook_complete_path = path.resolve(hooks_dir, hook_path);
          let hook_def = require(hook_complete_path);

          return work_hook(hook_def, hook_path);
        })));
        resolve();
      });
    });
    return promise;
  }
};


module.exports = hooks;
