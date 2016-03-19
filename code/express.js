"use strict";

const config = require('./config');
const logger = require('./logger');

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const Promise = require('promise');
const express = require("express");
const monitor = require("./monitor");
const bodyParser = require('body-parser');

let api = null;
let app = null;
let express_hooks = {};
let initialized = false;


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
        _:_,
        header: require("../assets/ansi-header-html.js"),
        hooks: _.groupBy(_.sortBy(_.sortBy(require("./hooks").get_hooks(), "name"), "namespace"), "namespace"),
        package_def: require("../package.json")
      });
    }
  },

  get_hooks: function () {
    return express_hooks;
  },

  init: function (params) {
    let promise = new Promise(function (resolve, reject) {
      api = params.api;
      let hooks = params.hooks;

      if (config.get("express:active") == false) {
        initialized = true;

        return resolve({
          api: api,
          hooks: hooks
        });
      }

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

          app.get('/help', express_service.list_methods);

          app.get('/tid', function (req, res) {
            if (authorized(req, res)) {
              res.json(api.get_hook_id() || false);
            }
          });

          app.post('/tid', function (req, res) {
            if (authorized(req, res)) {
              api.set_hook_id(req.body("id"));
              res.json((api.get_hook_id() || false) == req.body("id"));
            }
          });

          app.get('/hooked', function (req, res) {
            if (authorized(req, res)) {
              res.json(api.is_hooked());
            }
          });

          app.all('/start/:hook', function (req, res) {
            if (authorized(req, res)) {
              monitor.start(req.param("hook")).then(res.send).catch(res.send);
            }
          });

          app.all('/stop/:hook', function (req, res) {
            if (authorized(req, res)) {
              monitor.stop(req.param("hook")).then(res.send).catch(res.send);
            }
          });

          app.all('/restart/:hook', function (req, res) {
            if (authorized(req, res)) {
              monitor.restart(req.param("hook")).then(res.send).catch(res.send);
            }
          });

          for (let route_path in express_hooks) {
            if (express_hooks.hasOwnProperty(route_path)) {
              let hook = express_hooks[route_path];

              let router = _.bind(hook.route, hook);
              let method = (hook.method || "all").toLowerCase();
              let filter_params = [];

              if (_.isArray(hook.params)) {
                for (let i = 0; i < hook.params.length; i++) {
                  filter_params = _.union([], filter_params, [hook.params[i].name, hook.params[i].alias])
                }
              }

              filter_params = _.compact(filter_params);

              app[method]("/" + route_path, function (req, res) {
                if (authorized(req, res)) {
                  let params = _.pick(_.extend({}, req.params, req.query, req.body), filter_params);

                  router(params, api, req, res).then(function (content) {
                    if (_.isString(hook.response)) {
                      res.send(hook.response);
                    } else {
                      res.json(content);
                    }
                  }).catch(function (error) {
                    if (_.isString(hook.error)) {
                      res.status(500).send(hook.error);
                    } else {
                      res.status(500).send(error.message || error);
                    }
                  }).finally(function () {
                    res.end();
                  });
                }
              });
            }
          }

          initialized = true;

          resolve({
            api: api,
            hooks: hooks
          });
        }
      });
    });

    return promise;
  }
};

module.exports = express_service;
