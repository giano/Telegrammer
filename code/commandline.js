'use strict';

/**
 * CommandLineService
 * @namespace CommandLineService
 * @description Manages command line hooks. Callable using .tel.sh file or directly using index.js + command
 * @example See ['hooks/examples/spammer.js']{@link hooks/examples.spammer} for a commandline hook definition
 */

const hooks = require('./hooks');
const config = require('./config');
const _ = require('lodash');
const s = require('underscore.string');
const escape_string_regexp = require('escape-string-regexp');

_.mixin(s.exports());

/**
 * @property {TelegramService} api Link to TelegramService
 * @private
 * @memberof CommandLineService
 */

var api = null;

const Promise = require('promise');

/**
 * @property {Boolean} initialized If initialized
 * @private
 * @memberof CommandLineService
 */

let initialized = false;

/**
 * @class
 * @classdesc Manages command line hooks. Callable using .tel.sh file or directly using index.js + command
 */

const CommandLineService = {
  /**
   * @function execute
   * @description Executes the command using the registered hook.<br/>You can run <strong>.tel.sh help</strong> for a list of registered commands, then <strong>.tel.sh help COMMAND_NAME</strong> for a more specific view.
   * @static
   * @param {string} command Command to be executed.
   * @param {object} params command line passed params as defined in the hook.
   * @memberof CommandLineService
   * @public
   * @returns {Promise}
   */

  execute: function (command, params) {
    return new Promise(function (resolve, reject) {
      hooks.load().then(function () {
        var cm_hooks = hooks.get_hooks('has_command_line_hook', 'cmd_name');

        params = params || {};
        command = command.toLowerCase();

        if (!api.is_hooked()) {
          var error = new Error('Telegram service not hooked. Send first message.');
          return reject(error);
        }

        if (cm_hooks[command]) {
          var command_hook = cm_hooks[command];
          if (command_hook.exec) {
            if (_.isFunction(command_hook.exec)) {
              return command_hook.exec(params, api).then(resolve).catch(reject);
            } else if (_.isString(command_hook.exec)) {
              var out_str = command_hook.exec;
              for (let key in params) {
                if (params.hasOwnProperty(key)) {
                  let regsrc = new RegExp(`@${escape_string_regexp(key)}@`, 'img');
                  out_str = out_str.replace(regsrc, params[key]);
                }
              }
              return api.send(out_str);
            } else {
              let error = new Error('Command not implemented.');
              return reject(error);
            }
          } else {
            let error = new Error('Command not implemented.');
            return reject(error);
          }
        } else {
          let error = new Error('Command not found.');
          return reject(error);
        }
      }).catch(reject);
    });
  },

  /**
   * @function init
   * @description Initialize command line hooks manager
   * @static
   * @param {TelegramService} tapi Link to Telegram service
   * @memberof CommandLineService
   * @public
   * @returns {Promise}
   */

  init: function (tapi) {
    api = tapi;

    return new Promise(function (resolve, reject) {
      if (config.get('commandline:active') === false) {
        initialized = true;
        return resolve(api);
      }

      process.nextTick(function () {
        initialized = true;
        resolve(api);
      });
    });
  }
};

module.exports = CommandLineService;
