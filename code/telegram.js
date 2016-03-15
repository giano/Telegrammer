"use strict";

const config = require('./config');
const _ = require('underscore');

const Promise = require('promise');
const Telegram = require('telegram-bot-api');
const device_regex = /%([\d\w_\-\.]+)/i;

let api = null;
let telegram_hooks = [];

const telegram_service = {

  respond: function (message, content) {
    api.sendMessage({
      reply_to_message_id: message.id,
      text: content,
      chat_id: message.chat.id
    });
  },

  init: function (hooks) {

    telegram_hooks = hooks.filter(function (el) {
      return el.has_telegram_hook
    });

    let promise = new Promise(function (resolve, reject) {
      var token = config.get("telegram:token");

      api = new Telegram({
        token: token,
        updates: {
          enabled: true,
          pooling_timeout: 6000
        }
      });

      api.getMe().then(function (data) {
        data = data || {};
        resolve(api, hooks);
      }).catch(function (err) {
        reject(err);
      });

      api.on('message', function (message) {
        if (message.from && message.from.username == config.get('device_owner_username')) {
          let message_text = message.text || message.caption;
          if (message_text) {
            let to_device = "all";
            if (device_regex.test(message_text)) {
              let to_device = (device_regex.exec(message_text)[1] || "!!!").toString().toLowerCase();
            }
            if (!config.get("telegram:chat_id") && message.chat && message.chat.id) {
              config.set("telegram:chat_id", message.chat.id);
            }
            for (let hook_id in telegram_hooks) {
              let hook = telegram_hooks[hook_id];
              if (hook.all || config.get('device_name') == to_device || _.contains(config.get('execute_devices'), to_device)) {
                if (hook.command) {
                  if (message_text == hook.command) {
                    console.log(`Executing ${hook.full_name}`);
                    hook.action(message, telegram_service, [], function (error, response) {
                      if (error) {
                        console.error(`Error executing ${hook.full_name}: ${error}`);
                      } else {
                        console.log(`Executed ${hook.full_name}`);
                      }
                    });
                    return;
                  }
                } else if (hook.match) {
                  let regex_to_match = hook.match;
                  if (regex_to_match.test(message_text)) {
                    console.log(`Executing ${hook.full_name}`);
                    let matches = regex_to_match.exec(message_text);
                    hook.action(message, telegram_service, matches, function (error, response) {
                      if (error) {
                        console.error(`Error executing ${hook.full_name}: ${error}`);
                      } else {
                        console.log(`Executed ${hook.full_name}`);
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
