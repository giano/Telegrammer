"use strict";

const config = require('./config');
const logger = require('./logger');

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const Promise = require('promise');
const express = require("express");
const bodyParser = require('body-parser');

let api = null;
let app = null;
let express_hooks = {};

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
      res.render('_sys/list', {
        header: require("../assets/ansi-header-html.js"),
        hooks: require("./hooks").get_hooks(),
        package_def: require("../package.json")
      });
    }
  },

  get_hooks: function () {
    return express_hooks;
  },

  init: function (params) {
    let promise = new Promise(function (resolve, reject) {
      if (config.get("express:active") == false) {
        return resolve(false);
      }

      api = params.api;
      let hooks = params.hooks;

      const path = require('path');
      const dir = path.resolve(__dirname, '..');

      express_hooks = _.indexBy(hooks.filter(function (el) {
        return el.has_web_hook;
      }), "route_path");

      app = express();

      app.set('view engine', 'jade');
      app.set('views', path.resolve(dir, 'views'));

      app.use(bodyParser.urlencoded({
        extended: false
      }));

      app.use(bodyParser.json());

      app.use(express.static('public'));

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

          for (let route_path in express_hooks) {
            if (express_hooks.hasOwnProperty(route_path)) {
              let hook = express_hooks[route_path];
              let router = _.bind(hook.route, hook);
              app.post(route_path, function (req, res) {
                if (authorized(req, res)) {
                  router(req, res, api).then(function (content) {
                    res.json(content);
                  }).catch(function (error) {
                    res.status(500).send(error.message || error);
                  });
                }
              });
            }
          }

          resolve(true);
        }
      });
    });

    return promise;
  }
};

module.exports = express_service;
