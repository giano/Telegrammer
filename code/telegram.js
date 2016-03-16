"use strict";

const config = require('./config');
const logger = require('./logger');
const escape_string_regexp = require('escape-string-regexp');
const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const Promise = require('promise');
const Telegram = require('telegram-bot-api');
const device_regex = new RegExp(`${escape_string_regexp(config.get("telegram:device_name_char"))}([\\d\\w_\\-\\.]+)`, "i");

let api = null;
let telegram_hooks = [];

const telegram_service = {

  get_hook_id: function () {
    return process.env.TEL_CID || config.get("telegram:chat_id")
  },

  is_hooked: function () {
    return !!(telegram_service.get_hook_id() || 0);
  },

  set_hook_id: function (id) {
    process.env.TEL_CID = id;
    config.set("telegram:chat_id", id);
    return telegram_service.get_hook_id();
  },

  respond: function (message, content) {
    let chat_id = (message.chat.id || telegram_service.get_hook_id());
    if (chat_id) {
      api.sendMessage({
        parse_mode: config.get("telegram:parse_mode"),
        reply_to_message_id: message.id,
        text: content,
        chat_id: chat_id
      }).catch(function (error) {
        logger.error(error);
      });
    } else {
      logger.error(new Exception("Telegram service not hooked. Send first message."));
    }
  },

  send: function (content) {
    if (telegram_service.is_hooked()) {
      api.sendMessage({
        parse_mode: config.get("telegram:parse_mode"),
        text: content,
        chat_id: telegram_service.get_hook_id()
      }).catch(function (error) {
        logger.error(error);
      });
    } else {
      logger.error(new Exception("Telegram service not hooked. Send first message."));
    }
  },

  init: function (hooks, tcid) {

    telegram_hooks = hooks.filter(function (el) {
      return el.has_telegram_hook
    });

    if(tcid){
      telegram_service.set_hook_id(tcid);
    }

    let promise = new Promise(function (resolve, reject) {
      var token = config.get("telegram:token");

      api = new Telegram({
        token: token,
        updates: {
          enabled: true,
          get_interval: (config.get("telegram:interval") || 1000) * 1,
          pooling_timeout: (config.get("telegram:interval") || 1000) * 6
        }
      });

      api.getMe().then(function (data) {
        data = data || {};
        if (telegram_service.is_hooked()) {
          logger.log(`Hooked to chat id #${telegram_service.get_hook_id()}`);
        } else {
          logger.log(`Telegram not hooked. Waiting first message to hook to chat.`);
        }
        resolve({
          api: telegram_service,
          hooks: hooks
        });

      }).catch(function (err) {
        reject(err);
      });

      api.on('message', function (message) {
        if (message.from && message.from.username == config.get('device_owner_username')) {
          let message_text = message.text || message.caption;
          if (message_text) {
            let to_device = "all";

            if (device_regex.test(message_text)) {
              let dev_match = device_regex.exec(message_text);
              console.log(dev_match);
              if (dev_match) {
                to_device = (dev_match[1] || "!!!").toString().toLowerCase();
              } else {
                to_device = ("!!!").toString().toLowerCase();
              }
            }

            to_device = _.trim(to_device);

            if (!telegram_service.is_hooked() && message.chat && message.chat.id) {
              telegram_service.set_hook_id(message.chat.id);
              logger.log(`Hooked to chat id #${telegram_service.get_hook_id()}`);
            }

            for (let hook_id in telegram_hooks) {
              let hook = telegram_hooks[hook_id];
              if (hook.all || (config.get('device_group') == to_device) || (config.get('device_name') == to_device) || _.contains(config.get('execute_devices'), to_device)) {
                if (hook.command) {
                  if (message_text == hook.command) {
                    logger.log(`Executing ${hook.full_name}`);
                    hook.action(message, telegram_service, [], function (error, response) {
                      if (error) {
                        loggererror(`Error executing ${hook.full_name}: ${error}`);
                      } else {
                        logger.log(`Executed ${hook.full_name}`);
                      }
                    });
                    return;
                  }
                } else if (hook.match) {
                  let regex_to_match = hook.match;
                  if (regex_to_match.test(message_text)) {
                    logger.log(`Executing ${hook.full_name}`);
                    let matches = regex_to_match.exec(message_text);
                    hook.action(message, telegram_service, matches, function (error, response) {
                      if (error) {
                        loggererror(`Error executing ${hook.full_name}: ${error}`);
                      } else {
                        logger.log(`Executed ${hook.full_name}`);
                      }
                    });
                    return;
                  }
                }
              }
            }
          }
        }
      });
    });
    return promise;
  }
}

module.exports = telegram_service;
