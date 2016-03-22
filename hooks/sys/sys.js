"use strict";

const config = require('../../code/config');
const Promise = require('promise');
const path = require('path');
let shutdown_path = path.resolve(__dirname, 'shutdown.sh');
let reboot_path = path.resolve(__dirname, 'reboot.sh');

module.exports = [{
  all: true,
  name: "list",
  command: "list",
  action: function (message, service, matches) {
    return Promise.resolve(`*${config.get("telegram:device_name_char")}${config.get("device_name")}* of group *${config.get("telegram:device_name_char")}${config.get("device_group")}*`);
  },
  response: true
}, {
  name: "reboot",
  command: "reboot",
  action: reboot_path,
  response: true
}, {
  name: "shutdown",
  command: "shutdown",
  action: shutdown_path,
  response: true
}];
