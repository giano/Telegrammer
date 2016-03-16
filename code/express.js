"use strict";

const config = require('./config');
const logger = require('./logger');

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const Promise = require('promise');
const express = require("express");

var api = null;
var app = null;
var express_hooks = {};

const authorized = function (req, res) {
  if (config.get("express:auth") && config.get("express:auth_token_name")) {
    if (req.get(config.get("express:auth_token_name")) == config.get("express:auth")) {
      return true;
    } else {
      res.sendStatus(403);
      return false;
    }
  } else {
    return true;
  }
};

const express_service = {
  list_methods: function (req, res) {
    if (authorized(req, res)) {

    }
  },
  init: function (params) {
    api = params.api;
    let hooks = params.hooks;

    express_hooks = _.indexBy(hooks.filter(function (el) {
      return el.has_web_hook;
    }), "route_path");

    let promise = new Promise(function (resolve, reject) {
      app = express();
      let port = (process.env.PORT || config.get("express:port") || 3000);
      app.listen(port, function (error) {
        if (error) {
          reject(error);
        } else {
          logger.log(`WebServer is listening on port ${port}`);

          app.get('/_sys/list', express_service.list_methods);

          app.get('/_sys/tid', function (req, res) {
            if (authorized(req, res)) {
              res.json(api.get_hook_id() || false);
            }
          });

          app.post('/_sys/tid', function (req, res) {
            if (authorized(req, res)) {
              api.set_hook_id(req.body("id"));
            }
          });

          app.get('/_sys/hooked', function (req, res) {
            if (authorized(req, res)) {
              res.json(api.is_hooked());
            }
          });

          resolve(true);
        }
      });
    });

    return promise;
  }
};

module.exports = express_service;
