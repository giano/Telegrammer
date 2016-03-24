"use strict";

const config = require('../../code/config');
const hooks = require('../../code/hooks');
const package_def = require('../../package');
const Promise = require('promise');
const path = require('path');
const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

module.exports = [{
  description: "This help",
  name: "help",
  command: "help",
  plain: true,
  action: function (message, service, matches) {
    let commands = hooks.get_commands();
    let out_str = `${package_def.name} v${package_def.version}\n${package_def.description}\n\nCommands:\n`;
    _.each(commands, function (el) {
      out_str = `${out_str}${_.trim(el.command)} - ${_.clean(el.description)}\n`;
    });
    return Promise.resolve(_.trim(out_str).toString());
  },
  response: true
}, {
  description: "For importing command into BotFather",
  name: "import_commands",
  command: "import_commands",
  plain: true,
  action: function (message, service, matches) {
    let commands = hooks.get_commands();
    let out_str = "start - Start the Bot\n";
    _.each(commands, function (el) {
      out_str = `${out_str}${_.trim(el.command).substring(1)} - ${_.clean(el.description)}\n`;
    });
    return Promise.resolve(_.trim(out_str).toString());
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
