"use strict";


const hooks = require('./hooks');
const config = require('./config');
const monitor = require('./monitor');

const dnode = require('dnode');
const net = require('net');
const _ = require('underscore');
const s = require("underscore.string");

_.mixin(s.exports());

const Promise = require('promise');

let port = (config.get('rpc_port') || 5004) * 1;
let initialized = false;
let server = null;

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

const rpc_service = {
  send: function (what, params) {
    return new Promise(function (resolve, reject) {
      dnode.connect(port, function (remote, conn) {
        let fn = remote[what];
        if (_.isFunction(fn)) {
          fn(params, function (n) {
            resolve(n);
            conn.end();
          });
        } else {
          conn.end();
          reject(new Error(`${what} was not found`));
        }
      });
    });
  },

  init: function (tapi) {
    let api = tapi;

    return new Promise(function (resolve, reject) {
      initialized = true;

      server = dnode(function (remote, conn) {

        for (let action in actions) {
          let action_fn = actions[action];
          this[action] = _.bind(action_fn, this);
        }

        process.nextTick(function () {
          resolve(tapi);
        });
      });

      server.listen(port);
    });
  }
}

module.exports = rpc_service;
