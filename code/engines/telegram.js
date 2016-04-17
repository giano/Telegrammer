'use strict';

/**
 * TelegramService
 * @namespace TelegramService
 * @description Manages telegram service two way communication
 */

const hooks = require('../hooks');
const config = require('../config');
const logger = require('../logger');

const _ = require('lodash');
const s = require('underscore.string');
_.mixin(s.exports());

const Promise = require('promise');
const Telegram = require('node-telegram-bot-api');

/**
 * @property {Telegram} api Link to Telegram Module
 * @private
 * @memberof TelegramService
 */

let api = null;

/**
 * @property {Boolean} initialized If initialized
 * @private
 * @memberof TelegramService
 */

let initialized = false;

let next_manage_reply = {};

/**
 * @function register_message_hook
 * @description Check if call is authorized
 * @static
 * @param {Object} hook Hook to be registered on Telegram Bot
 * @memberof TelegramService
 * @public
 * @returns {Promise}
 */

const register_message_hook = function (hook) {
  return new Promise(function (resolve, reject) {
    let match = null;

    if (hook.match) {
      match = hook.match;
    } else {
      return reject(new Error('No matching string'));
    }

    let manager = _.bind(function (msg, match) {
      manage_message(msg, match, this);
    }, hook);

    api.onText(match, manager);

    resolve();
  });
};

/**
 * @function manage_message
 * @description Check if call is authorized
 * @static
 * @param {Object} message Message received from the Bot
 * @param {String[]} matches Regex captured matches
 * @param {Object} hook Managed hook
 * @memberof TelegramService
 * @private
 */

const manage_message = function (message, matches, hook) {
  if (message.from && message.from.username && (!config.get('allowed_usernames') || ((config.get('allowed_usernames') && _.includes(config.get('allowed_usernames')), message.from.username.toLowerCase())))) {
    let message_text = message.text || message.caption;
    if (message_text) {
      message_text = _.clean(message_text);

      if (!TelegramService.is_hooked() && message.chat && message.chat.id) {
        TelegramService.set_hook_id(message.chat.id);
        logger.log(`Hooked to chat id #${TelegramService.get_hook_id()}`);
      }

      logger.log(`Executing ${hook.full_name}`);
      hook.action(message, TelegramService, matches).then(function (response) {
        logger.notify(`Executed ${hook.full_name}`);
      }).catch(function (error) {
        logger.error(`Error executing ${hook.full_name}: ${error}`);
      });
    }
  }
};

/**
 * @class
 * @classdesc Manages telegram service two way communication
 */

const TelegramService = {

  register_message_hook: register_message_hook,

  /**
   * @function get_hook_id
   * @description Get Bot chat ID
   * @static
   * @memberof TelegramService
   * @public
   * @returns {Number}
   */

  get_hook_id: function () {
    return process.env.TEL_CID || config.get('telegram:chat_id');
  },

  /**
   * @function is_hooked
   * @description Check if Chat ID has been linked
   * @static
   * @memberof TelegramService
   * @public
   * @returns {Boolean}
   */

  is_hooked: function () {
    return !!(TelegramService.get_hook_id() || 0);
  },

  /**
   * @function set_hook_id
   * @description Set Bot chat ID
   * @static
   * @param {Number} id Chat ID to be set
   * @memberof TelegramService
   * @public
   * @returns {Number}
   */

  set_hook_id: function (id) {
    process.env.TEL_CID = id;
    config.set('telegram:chat_id', id);
    return TelegramService.get_hook_id();
  },

  /**
   * @function respond
   * @description Respond to a user's message
   * @static
   * @param {Object} message Message you want answer to
   * @param {String} content Answer's content
   * @param {Boolean} plain Disable markdown/html parse mode
   * @memberof TelegramService
   * @public
   * @returns {Promise}
   */

  respond: function (message, content, plain) {
    let chat_id = (message.chat.id || TelegramService.get_hook_id());
    if (chat_id) {
      return api.sendMessage(chat_id, content, {
        parse_mode: plain === true ? null : config.get('telegram:parse_mode'),
        reply_to_message_id: message.id
      });
    } else {
      let error = new Error('Telegram service not hooked. Send first message.');
      return Promise.reject(error);
    }
  },

  /**
   * @function send
   * @description Send a message to user
   * @static
   * @param {String} content Message's content
   * @param {Boolean|Array} reply Force a user reply using normal or customized keyboard
   * @param {Array} accepted_responses Validates user response
   * @param {Boolean} one_time_keyboard Close custom keyboard after use
   * @param {Boolean} plain Disable markdown/html parse mode
   * @memberof TelegramService
   * @public
   * @returns {Promise}
   */
  send: function (content, reply, accepted_responses, one_time_keyboard, plain) {
    if (TelegramService.is_hooked()) {
      let options = {
        parse_mode: plain === true ? null : config.get('telegram:parse_mode')
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
            return _.trim(el).toString().toLowerCase();
          });
        }

        options.reply_markup = {
          force_reply: true,
          keyboard: reply,
          one_time_keyboard: one_time_keyboard !== false
        };
      }

      if (options.reply_markup) {
        return new Promise(function (resolve, reject) {
          return api.sendMessage(TelegramService.get_hook_id(), content, options).then(function (output) {
            if (output && output.message_id) {
              let chat_id = (output.chat.id || TelegramService.get_hook_id());

              let manage_reply = function (reply_message) {
                if (reply_message && reply_message.text) {
                  let reply_message_compare = _.trim(reply_message.text).toLowerCase();
                  if (accepted_responses && _.isArray(accepted_responses) && accepted_responses.length) {
                    if (_.includes(accepted_responses, reply_message_compare)) {
                      resolve(reply_message);
                    } else {
                      reject(new Error('Reply response invalid'));
                    }
                  } else {
                    resolve(reply_message);
                  }
                } else {
                  reject(new Error('Reply message not received'));
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
              reject(new Error('Reply message not sent'));
            }
          }).catch(reject);
        });
      } else {
        return api.sendMessage(TelegramService.get_hook_id(), content, options);
      }
    } else {
      let error = new Error('Telegram service not hooked. Send first message.');
      return Promise.reject(error);
    }
  },

  /**
   * @function init
   * @description Initialize Telegram Manager
   * @static
   * @param {Number} tcid Chat ID (if provided)
   * @param {Boolean} is_command If it's an 'one shot' command will not poll or log.
   * @memberof TelegramService
   * @public
   * @returns {Promise}
   */

  init: function (tcid, is_command) {
    return new Promise(function (resolve, reject) {
      hooks.load().then(function () {
        let token = config.get('telegram:token') || process.env.TEL_TOKEN;

        if (tcid) {
          TelegramService.set_hook_id(tcid);
        }

        api = new Telegram(token, {
          polling: (is_command ? false : {
            interval: (config.get('telegram:interval') || 1000) * 1,
            timeout: (config.get('telegram:interval') || 1000) * 6
          })
        });

        api.getMe().then(function (data) {
          data = data || {};

          if (is_command !== true) {
            logger.log(`Using bot @${data.username}, ${data.first_name}, ID: ${data.id}`);
            if (TelegramService.is_hooked()) {
              logger.log(`Hooked to chat id #${TelegramService.get_hook_id()}`);
            } else {
              logger.log(`Telegram not hooked. Waiting first message to hook to chat.`);
            }
          }

          api.on('message', function (message) {
            let chat_id = (message.chat.id || TelegramService.get_hook_id());
            if (message && chat_id && next_manage_reply[chat_id]) {
              let handler = next_manage_reply[chat_id];
              handler.resolve(message);
              delete next_manage_reply[chat_id];
            }
          });

          initialized = true;
          resolve(TelegramService);
        }).catch(reject);
      }).catch(reject);
    });
  }
};

module.exports = TelegramService;
