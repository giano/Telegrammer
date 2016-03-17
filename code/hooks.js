"use strict";

const config = require('./config');
const logger = require('./logger');

const Promise = require('promise');
const escape_string_regexp = require('escape-string-regexp');
const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const hooks = {
  load: function () {
    let promise = new Promise(function (resolve, reject) {
      const path = require('path');
      const dir = path.resolve(__dirname, '..');
      const hooks_dir = path.resolve(dir, config.get('hooks:folder'));
      const glob = require("glob");
      const options = {
        cwd: hooks_dir,
        root: hooks_dir
      };
      const hooks_pattern = `**/*.{js,json,coffee}`;
      glob(hooks_pattern, options, function (error, matches) {
        if (error) return reject(error);
        matches = matches || [];
        let matches_out = matches.map(function (hook_path) {
          let hook_complete_path = path.resolve(hooks_dir, hook_path);
          let hook_def = require(hook_complete_path);
          return work_hook(hook_def, hook_path);
        });
        matches_out = matches_out.filter(function (e) {
          return e
        });
        resolve(matches_out);
      });
    });
    return promise;
  }
};

const work_hook = function (hook_def, hook_path) {
  if (hook_def) {
    if (((hook_def.match || hook_def.command) && hook_def.action) || (hook_def.route) || (hook_def.commandline) || (hook_def.exec)) {
      const path = require('path');
      hook_def.namespace = hook_def.namespace || path.dirname(hook_path) || 'default';
      hook_def.name = hook_def.name || path.basename(hook_path, path.extname(hook_path));
      hook_def.full_name = `${_.underscored(_.slugify(hook_def.namespace))}/${_.underscored(_.slugify(hook_def.name))}`;
      hook_def.route_path = _.replaceAll(hook_def.full_name.toLowerCase(), "_", "/");
      hook_def.cmd_name = _.replaceAll(hook_def.route_path, "/", ":").toLowerCase();

      hook_def.has_telegram_hook = hook_def.action != null;
      hook_def.has_web_hook = hook_def.route != null;
      hook_def.has_command_line_hook = hook_def.commandline != null;

      if (hook_def.match && _.isString(hook_def.match)) {
        hook_def.match = new RegExp(escape_string_regexp(hook_def.match), "im");
      }

      if (hook_def.command) {
        if (hook_def.command.indexOf('/') == -1) {
          hook_def.command = `/${hook_def.command}`;
        }
        hook_def.command = hook_def.command.toLowerCase();
      }

      if (_.isString(hook_def.action)) {
        let action_command = hook_def.action;
        let action_fn = _.bind(function (message, service, matches) {
          let promise = new Promise(function (resolve, reject) {
            const exec = require('child_process').exec;
            matches = matches || [];
            let result_command = action_command;
            for (let i = 0; i < matches.length; i++) {
              let placeholder = new RegExp(`@${i}@`, 'mgi');
              result_command = result_command.replace(placeholder, matches[i]);
            }

            let child = exec(result_command, function (error, stdout, stderr) {
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
                  service.respond(message, error_msg.replace(/@error@/mi, (error.message || error))).then(resolve).catch(reject);
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

module.exports = hooks;
