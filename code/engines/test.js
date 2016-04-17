'use strict';

/**
 * TelegramTestService
 * @namespace TelegramTestService
 * @description Manages fake telegram service two way communication
 */

const hooks = require('../hooks');
const config = require('../config');
const logger = require('../logger');

const _ = require('lodash');
const s = require('underscore.string');
_.mixin(s.exports());

const Promise = require('promise');
const EventEmitter = require('events').EventEmitter;
const util = require('util');


/**
 * @property {TestApi} api Link to Fake Telegram Module
 * @private
 * @memberof TelegramTestService
 */

let api = null;

const from_user = {
  id: 1234,
  first_name: 'Fake',
  last_name: 'User',
  username: 'fakeuser'
};

const fake_chat = {
  id: 4321,
  first_name: 'Fake',
  last_name: 'Chat',
  username: 'fakechat',
  type: 'private'
};

const fake_bot_data = {
  id: 5678,
  first_name: 'TestApi',
  last_name: 'Telegram',
  username: 'TelegrammerFakeBot'
};

const TestApi = function (token, params) {
  EventEmitter.call(this);
  let self = this;
  self.registered_handlers = {};
  self.registered_reply_handlers = {};
  self.last_message_id = 100;
};

util.inherits(TestApi, EventEmitter);

TestApi.prototype.onText = function (regex, handler) {
  this.registered_handlers[regex] = handler;
};

TestApi.prototype.sendMessage = function (chat_id, content, options) {
  let self = this;
  options = options || {};
  return new Promise(function (resolve, reject) {
    process.nextTick(function () {
      let message_date = new Date();
      let message_id = options.fake_id || self.last_message_id++;
      if (options.fail) {
        reject(new Error(options.fail));
      } else {
        let message = options.fake_message || {
          message_id: message_id,
          date: message_date.getTime(),
          text: content
        };
        message.from = message.from || fake_bot_data;
        message.chat = message.chat || fake_chat;
        if (options.fake_reply) {
          let fake_reply = _.extend({}, options.fake_reply, {
            reply_to_message: message
          });
          setTimeout(function () {
            self.receiveMessage(fake_reply);
          }, options.fake_reply_timeout || 100);
        }
        resolve(message);
      }
    });
  });
};

TestApi.prototype.onReplyToMessage = function (chat_id, message_id, handler) {
  let self = this;
  let reply_to_id = `${chat_id}_${message_id}`;
  self.registered_reply_handlers[reply_to_id] = handler;
};

TestApi.prototype.getMe = function () {
  return Promise.resolve(fake_bot_data);
};

TestApi.prototype.receiveMessage = function (message) {
  let self = this;
  message.from = message.from || from_user;
  message.chat = message.chat || fake_chat;

  self.emit('message', message);

  if (message.chat && message.chat.id && message.reply_to_message && message.reply_to_message.message_id) {
    let reply_to_id = `${message.chat.id}_${message.reply_to_message.message_id}`;
    if (_.isFunction(self.registered_reply_handlers[reply_to_id])) {
      self.registered_reply_handlers[reply_to_id](message);
      delete self.registered_reply_handlers[reply_to_id];
    }
  }

  let text = message.text || '';

  for (let k in self.registered_handlers) {
    if (self.registered_handlers.hasOwnProperty(k)) {
      if (k.test(text)) {
        let handler = self.registered_handlers[k];
        if (_.isFunction(handler)) {
          let matches = text.match(k);
          handler(message, matches);
        }
        break;
      }
    }
  }
};

/**
 * @property {Boolean} initialized If initialized
 * @private
 * @memberof TelegramTestService
 */

let initialized = false;

let next_manage_reply = {};

/**
 * @function register_message_hook
 * @description Check if call is authorized
 * @static
 * @param {Object} hook Hook to be registered on Telegram Bot
 * @memberof TelegramTestService
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
 * @memberof TelegramTestService
 * @private
 */

const manage_message = function (message, matches, hook) {
  if (message.from && message.from.username && (!config.get('allowed_usernames') || ((config.get('allowed_usernames') && _.includes(config.get('allowed_usernames')), message.from.username.toLowerCase())))) {
    let message_text = message.text || message.caption;
    if (message_text) {
      message_text = _.clean(message_text);

      if (!TelegramTestService.is_hooked() && message.chat && message.chat.id) {
        TelegramTestService.set_hook_id(message.chat.id);
        logger.log(`Hooked to chat id #${TelegramTestService.get_hook_id()}`);
      }

      logger.log(`Executing ${hook.full_name}`);
      hook.action(message, TelegramTestService, matches).then(function (response) {
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

const TelegramTestService = {

  register_message_hook: register_message_hook,

  /**
   * @function get_hook_id
   * @description Get Bot chat ID
   * @static
   * @memberof TelegramTestService
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
   * @memberof TelegramTestService
   * @public
   * @returns {Boolean}
   */

  is_hooked: function () {
    return !!(TelegramTestService.get_hook_id() || 0);
  },

  /**
   * @function set_hook_id
   * @description Set Bot chat ID
   * @static
   * @param {Number} id Chat ID to be set
   * @memberof TelegramTestService
   * @public
   * @returns {Number}
   */

  set_hook_id: function (id) {
    process.env.TEL_CID = id;
    config.set('telegram:chat_id', id);
    return TelegramTestService.get_hook_id();
  },

  /**
   * @function respond
   * @description Respond to a user's message
   * @static
   * @param {Object} message Message you want answer to
   * @param {String} content Answer's content
   * @param {Boolean} plain Disable markdown/html parse mode
   * @memberof TelegramTestService
   * @public
   * @returns {Promise}
   */

  respond: function (message, content, plain) {
    let chat_id = (message.chat.id || TelegramTestService.get_hook_id());
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
   * @memberof TelegramTestService
   * @public
   * @returns {Promise}
   */
  send: function (content, reply, accepted_responses, one_time_keyboard, plain) {
    if (TelegramTestService.is_hooked()) {
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
          return api.sendMessage(TelegramTestService.get_hook_id(), content, options).then(function (output) {
            if (output && output.message_id) {
              let chat_id = (output.chat.id || TelegramTestService.get_hook_id());

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
        return api.sendMessage(TelegramTestService.get_hook_id(), content, options);
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
   * @memberof TelegramTestService
   * @public
   * @returns {Promise}
   */

  init: function (tcid, is_command) {
    tcid = tcid || fake_chat.id;

    return new Promise(function (resolve, reject) {
      hooks.load().then(function () {
        let token = config.get('telegram:token') || process.env.TEL_TOKEN;

        if (tcid) {
          TelegramTestService.set_hook_id(tcid);
        }

        api = new TestApi(token, {
          polling: (is_command ? false : {
            interval: (config.get('telegram:interval') || 1000) * 1,
            timeout: (config.get('telegram:interval') || 1000) * 6
          })
        });

        api.getMe().then(function (data) {
          data = data || {};

          if (is_command !== true) {
            logger.log(`Using bot @${data.username}, ${data.first_name}, ID: ${data.id}`);
            if (TelegramTestService.is_hooked()) {
              logger.log(`Hooked to chat id #${TelegramTestService.get_hook_id()}`);
            } else {
              logger.log(`Telegram not hooked. Waiting first message to hook to chat.`);
            }
          }

          api.on('message', function (message) {
            let chat_id = (message.chat.id || TelegramTestService.get_hook_id());
            if (message && chat_id && next_manage_reply[chat_id]) {
              let handler = next_manage_reply[chat_id];
              handler.resolve(message);
              delete next_manage_reply[chat_id];
            }
          });

          initialized = true;
          resolve(TelegramTestService);
        }).catch(reject);
      }).catch(reject);
    });
  }
};

module.exports = TelegramTestService;
