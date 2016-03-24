"use strict";

const hooks = require('./hooks');
const config = require('./config');
const logger = require('./logger');

const escape_string_regexp = require('escape-string-regexp');
const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const Promise = require('promise');
const Telegram = require('node-telegram-bot-api');

let api = null;
let initialized = false;

let next_manage_reply = {};

const register_message_hook = function (hook) {
  let promise = new Promise(function (resolve, reject) {

    let match = null;

    if (hook.match) {
      match = hook.match;
    } else {
      return reject(new Error("No matching string"));
    }

    let manager = _.bind(function (msg, match) {
      manage_message(msg, match, this);
    }, hook);

    api.onText(match, manager);

    resolve();
  });

  return promise;
};

const manage_message = function (message, matches, hook) {
  if (message.from && (config.get('allowed_usernames') && _.contains(config.get('allowed_usernames'), message.from.username.toLowerCase()))) {
    let message_text = message.text || message.caption;
    if (message_text) {

      message_text = _.clean(message_text);

      if (!telegram_service.is_hooked() && message.chat && message.chat.id) {
        telegram_service.set_hook_id(message.chat.id);
        logger.log(`Hooked to chat id #${telegram_service.get_hook_id()}`);
      }

      logger.log(`Executing ${hook.full_name}`);
      hook.action(message, telegram_service, matches).then(function (response) {
        logger.notify(`Executed ${hook.full_name}`);
      }).catch(function (error) {
        logger.error(`Error executing ${hook.full_name}: ${error}`);
      });

    }
  }
};

const telegram_service = {

  register_message_hook: register_message_hook,

  get_hook_id: function () {
    return process.env.TEL_CID || config.get("telegram:chat_id");
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
      return api.sendMessage(chat_id, content, {
        parse_mode: config.get("telegram:parse_mode"),
        reply_to_message_id: message.id
      });
    } else {
      let error = new Error("Telegram service not hooked. Send first message.");
      return Promise.reject(error);
    }
  },

  send: function (content, reply, accepted_responses, one_time_keyboard) {
    if (telegram_service.is_hooked()) {

      let options = {
        parse_mode: config.get("telegram:parse_mode")
      };

      let has_keyboard = false;

      if (_.isBoolean(reply) && reply) {
        options.reply_markup = {
          force_reply: true
        };
      } else if (_.isArray(reply) && reply.length > 0) {
        has_keyboard = true;

        if (!accepted_responses) {
          accepted_responses = [];
          _.each(reply, function (el) {
            if (_.isArray(el)) {
              accepted_responses = _.union(accepted_responses, el);
            } else {
              accepted_responses.push(accepted_responses);
            }
          });
          accepted_responses = _.map(accepted_responses, function (el) {
            return _.trim(el).toString().toLowerCase()
          });
        }

        options.reply_markup = {
          force_reply: true,
          keyboard: reply,
          one_time_keyboard: one_time_keyboard !== false
        };
      }

      if (options.reply_markup) {
        let promise = new Promise(function (resolve, reject) {

          return api.sendMessage(telegram_service.get_hook_id(), content, options).then(function (output) {
            if (output && output.message_id) {

              let chat_id = (output.chat.id || telegram_service.get_hook_id());

              let manage_reply = function (reply_message) {
                if (reply_message && reply_message.text) {
                  let reply_message_compare = _.trim(reply_message.text).toLowerCase();
                  if (accepted_responses && _.isArray(accepted_responses) && accepted_responses.length) {
                    if (_.contains(accepted_responses, reply_message_compare)) {
                      resolve(reply_message);
                    } else {
                      reject(new Error("Reply response invalid"));
                    }
                  } else {
                    resolve(reply_message);
                  }

                } else {
                  reject(new Error("Reply message not received"));
                }
              };

              if (has_keyboard) {
                next_manage_reply[chat_id] = {
                  resolve: manage_reply,
                  reject: reject
                };
              } else {
                api.onReplyToMessage(chat_id, output.message_id, manage_reply);
              }

            } else {
              reject(new Error("Reply message not sent"));
            }
          }).catch(reject);
        });
        return promise;
      } else {
        return api.sendMessage(telegram_service.get_hook_id(), content, options);
      }

    } else {
      let error = new Error("Telegram service not hooked. Send first message.");
      return Promise.reject(error);
    }
  },

  init: function (tcid) {
    let promise = new Promise(function (resolve, reject) {

      hooks.load().then(function () {
        let token = config.get("telegram:token");

        if (tcid) {
          telegram_service.set_hook_id(tcid);
        }

        let telegram_hooks = hooks.get_hooks("has_local_hook");

        api = new Telegram(token, {
          polling: {
            interval: (config.get("telegram:interval") || 1000) * 1,
            timeout: (config.get("telegram:interval") || 1000) * 6
          }
        });

        api.getMe().then(function (data) {
          data = data || {};

          logger.log(`Using bot @${data.username}, ${data.first_name}, ID: ${data.id}`);

          if (telegram_service.is_hooked()) {
            logger.log(`Hooked to chat id #${telegram_service.get_hook_id()}`);
          } else {
            logger.log(`Telegram not hooked. Waiting first message to hook to chat.`);
          }

          api.on("message", function (message) {
            let chat_id = (message.chat.id || telegram_service.get_hook_id());
            if (message && chat_id && next_manage_reply[chat_id]) {
              let handler = next_manage_reply[chat_id];
              let text = _.trim(message.text || "").toLowerCase();
              handler.resolve(message);
              delete next_manage_reply[chat_id];
            }
          });

          initialized = true;
          resolve(telegram_service);

        }).catch(reject);

      }).catch(reject);

    });

    return promise;
  }
}

module.exports = telegram_service;
