'use strict';

/**
 * RpcService
 * @namespace RpcService
 * @description Allows inter-service communication, allowing server start/stop/restart, etc...
 */

const hooks = require('./hooks');
const config = require('./config');
const monitor = require('./monitor');

const dnode = require('dnode');
const _ = require('lodash');
const s = require('underscore.string');

_.mixin(s.exports());

const Promise = require('promise');

let port = (config.get('rpc_port') || 5004) * 1;

/**
 * @property {Boolean} initialized If initialized
 * @private
 * @memberof RpcService
 */

let initialized = false;

let server = null;

/**
 * @property {Object}  actions                          Allowed RPC actions are defined here
 * @property {Function} action.start_monitor            Starts a registered monitor hook
 * @property {Function} action.stop_monitor             Stops a registered monitor hook
 * @property {Function} action.restart_monitor          Restarts a registered monitor hook
 * @property {Function} action.reload_hooks             Reload hooks
 * @memberof RpcService
 * @private
 */

const actions = {
  start_monitor: function (hook_name, cb) {
    monitor.start(hook_name).then(function (res) {
      cb(null, res);
    }).catch(function (err) {
      cb(err, null);
    });
  },
  stop_monitor: function (hook_name, cb) {
    monitor.stop(hook_name).then(function (res) {
      cb(null, res);
    }).catch(function (err) {
      cb(err, null);
    });
  },
  restart_monitor: function (hook_name, cb) {
    monitor.restart(hook_name).then(function (res) {
      cb(null, res);
    }).catch(function (err) {
      cb(err, null);
    });
  },
  reload_hooks: function (params, cb) {
    hooks.reload().then(function (res) {
      cb(null, res);
    }).catch(function (err) {
      cb(err, null);
    });
  }
};

/**
 * @class
 * @classdesc Allows inter-service communication, allowing server start/stop/restart, etc...
 */

const RpcService = {

  /**
   * @function send
   * @description send the command to the resident service, that will execute it and answer when completed/failed
   * @static
   * @param {string} command Command to be executed.
   * @param {object} params command line passed params.
   * @memberof RpcService
   * @public
   * @returns {Promise}
   */

  send: function (command, params) {
    return new Promise(function (resolve, reject) {
      dnode.connect(port, function (remote, conn) {
        let fn = remote[command];
        if (_.isFunction(fn)) {
          fn(params, function (n) {
            resolve(n);
            conn.end();
          });
        } else {
          conn.end();
          reject(new Error(`${command} was not found`));
        }
      });
    });
  },

  /**
   * @function init
   * @description Initialize Rpc manager
   * @static
   * @param {TelegramService} tapi Link to Telegram service
   * @memberof RpcService
   * @public
   * @returns {Promise}
   */

  init: function (tapi) {
    return new Promise(function (resolve, reject) {
      initialized = true;
      server = dnode(actions);
      let local_server = server.listen(port);
      local_server.on('listening', function () {
        process.nextTick(function () {
          resolve(tapi);
        });
      });
      local_server.on('error', function (err) {
        process.nextTick(function () {
          reject(err);
        });
      });
    });
  }
};

module.exports = RpcService;
