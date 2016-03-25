"use strict";

/**
 * ExpressService
 * @namespace ExpressService
 * @description Manages web hooks
 * @example See ["hooks/examples/webhook_spammer.js"]{@link hooks/examples.webhook_spammer} for a web hook definition
 */

const hooks = require('./hooks');
const monitor = require("./monitor");
const config = require('./config');
const logger = require('./logger');

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const Promise = require('promise');
const express = require("express");

const bodyParser = require('body-parser');

/**
 * @property {TelegramService} api Link to TelegramService
 * @private
 * @memberof ExpressService
  */

let api = null;

/**
 * @property {Express} app Link to Express app
 * @private
 * @memberof ExpressService
  */

let app = null;

/**
 * @property {Boolean} initialized If initialized
 * @private
 * @memberof ExpressService
  */

let initialized = false;

/**
 * @function authorized
 * @description Check if call is authorized
 * @static
 * @param {Request} req Web request
 * @param {Response} res Web response
 * @memberof ExpressService
 * @private
 * @returns {Boolean}
 */
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

/**
 * @class
 * @classdesc Manages web hooks
 */

const ExpressService = {
  /**
   * @function list_methods
   * @description Return an help page listing all mounted hooks
   * @static
   * @param {Request} req Web request
   * @param {Response} res Web response
   * @memberof ExpressService
   * @public
   */
  list_methods: function (req, res) {
    if (authorized(req, res)) {
      let out_hooks = _.groupBy(_.sortBy(_.sortBy(hooks.get_hooks(), "name"), "namespace"), "namespace");
      res.render('_sys/list', {
        _: _,
        config: config,
        header: require("../assets/ansi-header-html.js"),
        hooks: out_hooks,
        package_def: require("../package.json")
      });
    }
  },

  /**
   * @function init
   * @description Initialize web hooks manager
   * @static
   * @param {TelegramService} tapi Link to Telegram service
   * @memberof ExpressService
   * @public
   * @returns {Promise}
   */
  init: function (tapi) {
    return new Promise(function (resolve, reject) {
      api = tapi;

      hooks.load().then(function () {
        if (config.get("express:active") == false) {
          initialized = true;
          return resolve(api);
        }

        if (app) {
          app.close();
        }

        const path = require('path');
        const dir = path.resolve(__dirname, '..');

        let express_hooks = hooks.get_hooks("has_web_hook", "route_path");

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

            app.get('/', ExpressService.list_methods);

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
                      } else if (content !== null) {
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
      }).catch(reject);
    });
  }
};

module.exports = ExpressService;
