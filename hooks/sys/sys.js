"use strict";

const config = require('../../code/config');
const Promise = require('promise');
const path = require('path');

module.exports = [{
  all: true,
  description: "Every online device/server responds with its name and group",
  name: "list",
  command: "list",
  action: function (message, service, matches) {
    return Promise.resolve(`*${config.get("telegram:device_name_char")}${config.get("device_name")}* of group *${config.get("telegram:device_name_char")}${config.get("device_group")}*`);
  },
  response: true
}, {
  name: "reboot",
  confirmation: true,
  description: "Reboot the device/server",
  command: "reboot",
  shell: "reboot.sh",
  response: "Ok, rebooting..."
}, {
  name: "shutdown",
  confirmation: true,
  description: "Shutdown the device/server",
  command: "shutdown",
  shell: "shutdown.sh",
  response: "Ok, shutting down..."
}];
