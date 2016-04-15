'use strict';

/**
 * MonitorService
 * @namespace MonitorService
 * @description Manages monitoring hooks
 * @example See ['hooks/examples/monitor_cpu.js']{@link hooks/examples.monitor_cpu} for a monitoring hook definition
 * @example See ['hooks/examples/monitor_gpio.js']{@link hooks/examples.monitor_gpio} for a GPIO monitoring hook definition
 */

const hooks = require('./hooks');
const config = require('./config');

const _ = require('underscore');
const s = require('underscore.string');
const logger = require('./logger');
_.mixin(s.exports());

/**
 * @property {TelegramService} api Link to TelegramService
 * @private
 * @memberof MonitorService
 */

var api = null;

const Promise = require('promise');

/**
 * @property {Boolean} initialized If initialized
 * @private
 * @memberof MonitorService
 */

let initialized = false;

/**
 * @class
 * @classdesc Manages monitoring hooks
 */

const MonitorService = {
  /**
   * @function start
   * @description Starts a monitoring hook
   * @static
   * @param {string|Object} hook_or_name Monitoring hook or hook name to be started
   * @memberof MonitorService
   * @public
   * @returns {Promise}
   */
  start: function (hook_or_name) {
    return new Promise(function (resolve, reject) {
      hooks.load().then(function () {
        var mo_hooks = hooks.get_hooks('has_monitor_hook', 'full_name');
        if (_.isString(hook_or_name)) {
          hook_or_name = _.trim(hook_or_name).toLowerCase();
          let hook_ref = mo_hooks[hook_or_name];
          if (hook_ref) {
            return MonitorService.start(hook_ref);
          } else {
            return reject(new Error(`Hook ${hook_or_name} was not found`));
          }
        } else {
          let hook = hook_or_name;
          logger.notify(`Starting monitor hook "${hook.full_name}"...`);
          if (_.isObject(hook.gpio) && _.isFunction(hook.gpio.handler)) {
            try {
              if (config.get('gpio') === false) {
                return resolve(true);
              }
              const Gpio = require('onoff').Gpio;
              if (hook.gpio.device) {
                hook.gpio.device.unexport();
                hook.gpio.device.unwatchAll();
                delete hook.gpio.device;
              }
              hook.gpio.device = new Gpio(hook.gpio.pin, (hook.gpio.direction || 'in'), (hook.gpio.edge || 'both'));
              hook.gpio.device.watch(function (err, value) {
                hook.gpio.handler(err, value, hook, api).then(function (content) {
                  if (content) {
                    api.send(content, null, null, null, hook.plain);
                  }
                }).catch(function (error) {
                  api.send((error.message || error), null, null, null, hook.plain);
                });
              });
              logger.log(`Gpio Monitor hook '${hook.full_name}' started`);
              hook.started = true;
              return resolve(true);
            } catch (e) {
              return reject(e);
            }
          } else if (_.isFunction(hook.start_monitor)) {
            return hook.start_monitor(hook, api).then(function (arg) {
              hook.started = true;
              logger.log(`Monitor hook '${hook.full_name}' started`);
              return resolve(arg);
            });
          } else if (_.isFunction(hook.check)) {
            let _check = _.bind(hook.check, hook);
            let check = function () {
              _check(hook, api).then(function (content) {
                if (content) {
                  api.send(content, null, null, null, hook.plain);
                }
              }).catch(function (error) {
                api.send((error.message || error), null, null, null, hook.plain);
              });
            };
            if (hook._interval) {
              clearInterval(hook._interval);
            }
            hook._interval = setInterval(check, hook.interval || config.get('monitor:default_interval') || 5000);
            logger.notify(`Monitor hook "${hook.full_name}" started`);
            hook.started = true;
            return resolve(true);
          } else {
            return reject(new Error('Need "start_monitor" or "check" functions.'));
          }
        }
      }).catch(reject);
    });
  },
  /**
   * @function restart
   * @description Restarts a monitoring hook
   * @static
   * @param {string|Object} hook_or_name Monitoring hook or hook name to be restarted
   * @memberof MonitorService
   * @public
   * @returns {Promise}
   */
  restart: function (hook_or_name) {
    return MonitorService.stop(hook_or_name).finally(function () {
      return MonitorService.start(hook_or_name);
    });
  },

  /**
   * @function stop
   * @description Stops a monitoring hook
   * @static
   * @param {string|Object} hook_or_name Monitoring hook or hook name to be stopped
   * @memberof MonitorService
   * @public
   * @returns {Promise}
   */
  stop: function (hook_or_name) {
    return new Promise(function (resolve, reject) {
      hooks.load().then(function () {
        var mo_hooks = hooks.get_hooks('has_monitor_hook', 'full_name');
        if (_.isString(hook_or_name)) {
          hook_or_name = _.trim(hook_or_name).toLowerCase();
          var hook_ref = mo_hooks[hook_or_name];
          if (hook) {
            return MonitorService.stop(hook_ref);
          } else {
            return reject(new Error(`Hook "${hook_or_name}" was not found`));
          }
        } else {
          var hook = hook_or_name;
          logger.notify(`Stopping monitor hook "${hook.full_name}"`);
          if (_.isObject(hook.gpio) && _.isFunction(hook.gpio.handler)) {
            try {
              if (config.get('gpio') === false) {
                return resolve(true);
              }
              if (hook.gpio.device) {
                hook.gpio.device.unexport();
                hook.gpio.device.unwatchAll();
                delete hook.gpio.device;
              }
              logger.log(`Gpio Monitor hook "${hook.full_name}" stopped`);
              hook.started = false;
              return resolve(true);
            } catch (e) {
              return reject(e);
            }
          } else if (_.isFunction(hook.stop_monitor)) {
            return hook.stop_monitor(hook, api).then(function (arg) {
              logger.log(`Monitor hook "${hook.full_name}" stopped`);
              hook.started = false;
              return resolve(arg);
            });
          } else if (_.isFunction(hook.check)) {
            if (hook._interval) {
              clearInterval(hook._interval);
            }
            logger.log(`Monitor hook "${hook.full_name}" stopped`);
            hook.started = false;
            return resolve(true);
          } else {
            return reject(new Error('Need "start_monitor" or "check" functions.'));
          }
        }
      }).catch(reject);
    });
  },
  /**
   * @function init
   * @description Initialize monitoring hooks manager
   * @static
   * @param {TelegramService} tapi Link to Telegram service
   * @memberof MonitorService
   * @public
   * @returns {Promise}
   */
  init: function (tapi) {
    api = tapi;
    return new Promise(function (resolve, reject) {
      hooks.load().then(function () {
        if (config.get('monitor:active') === false) {
          return resolve(api);
        }

        var mo_hooks = hooks.get_hooks('has_monitor_hook', 'full_name');

        var promises = [];

        for (let monitor_name in mo_hooks) {
          let hook = mo_hooks[monitor_name];
          if (hook.autostart !== false) {
            promises.push(MonitorService.start(hook));
          }
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
};

module.exports = MonitorService;
