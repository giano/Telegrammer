'use strict';

const hooks = require('../../code/hooks');
const package_def = require('../../package');
const Promise = require('promise');
const _ = require('lodash');
const s = require('underscore.string');
_.mixin(s.exports());

module.exports = [
  /**
   * @alias start
   * @member {Object} start
   * @description Respond to <strong>/start</strong> command
   * @memberOf hooks/sys
   */
  {
    description: 'Start Procedure',
    name: 'start',
    command: 'start',
    plain: false,
    action: function (message, service, matches) {
      let out_str = `*${package_def.name} v${package_def.version}* started...`;
      return Promise.resolve(_.trim(out_str).toString());
    },
    response: true
  },
  /**
   * @alias help
   * @member {Object} help
   * @description Respond to <strong>/help</strong> command, sending to Telegram a list of defined local hooks commands
   * @memberOf hooks/sys
   */
  {
    description: 'This help',
    name: 'help',
    command: 'help',
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
  },
  /**
   * @alias import_commands
   * @member {Object} import_commands
   * @description Respond to <strong>/import_commands</strong> command, sending to Telegram a list of defined local hooks commands for easy BotFather importing.<br/>Just copy result and paste into BotFather after a <strong>/setcommands</strong>
   * @memberOf hooks/sys
   */
  {
    description: 'For importing command into BotFather',
    name: 'import_commands',
    command: 'import_commands',
    plain: true,
    action: function (message, service, matches) {
      let commands = hooks.get_commands();
      let out_str = 'start - Start the Bot\n';
      _.each(commands, function (el) {
        out_str = `${out_str}${_.trim(el.command).substring(1)} - ${_.clean(el.description)}\n`;
      });
      return Promise.resolve(_.trim(out_str).toString());
    },
    response: true
  },
  /**
   * @alias reboot
   * @member {Object} reboot
   * @description Reboot the server or device after confirmation
   * @memberOf hooks/sys
   */
  {
    name: 'reboot',
    confirmation: true,
    description: 'Reboot the device/server',
    command: 'reboot',
    shell: 'reboot.sh',
    response: 'Ok, rebooting...'
  },
  /**
   * @alias shutdown
   * @member {Object} shutdown
   * @description Shutdown the server or device after confirmation
   * @memberOf hooks/sys
   */
  {
    name: 'shutdown',
    confirmation: true,
    description: 'Shutdown the device/server',
    command: 'shutdown',
    shell: 'shutdown.sh',
    response: 'Ok, shutting down...'
  }
];
