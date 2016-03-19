const config = require('../../code/config');
const Promise = require('promise');

module.exports = {
  all: true,
  command: "list",
  action: function (message, service, matches) {
    return Promise.resolve(`*${config.get("telegram:device_name_char")}${config.get("device_name")}* of group *${config.get("telegram:device_name_char")}${config.get("device_group")}*`);
  },
  response: true
};
