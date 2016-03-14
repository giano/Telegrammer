"use strict";

const config = require('./config');

const Promise = require('promise');
const Telegram = require('telegram-bot-api');
var api = null;

module.exports = {
  init: function (hooks) {
    let promise = new Promise(function (resolve, reject) {
      var token = config.get("telegram:token");
      api = new Telegram({
        token: token,
        updates: {
          enabled: true
        }
      });
      api.getMe().then(function(data) {
        console.log(data);
        resolve(api, hooks);
      }).catch(function (err) {
        reject(err);
      });
    });
    return promise;
  }
}
