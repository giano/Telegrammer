"use strict";

const Promise = require('promise');
const commandLineCommands = require('command-line-commands');
const getUsage = require("command-line-usage");
const config = require('./code/config');
const telegram = require('./code/telegram');
const hooks = require('./code/hooks');
const express = require('./code/express');
const commandline = require('./code/commandline');
const logger = require('./code/logger');
const ansi = require('ansi-escape-sequences');
const header = require('./assets/ansi-header');
const package_desc = require('./package.json');

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

hooks.load().then(function (hooks) {

  let tcid = null;

  let cm_hooks = hooks.filter(function (el) {
    return el.has_command_line_hook
  });

  const cli_common_conf = [{
    name: 'verbose',
    alias: 'v',
    type: Boolean,
    defaultOption: false
  }, {
    name: 'telegramid',
    alias: 'T',
    type: String
  }];

  let help = "";
  let footer = "-----------------------------";

  let cla = [{
    name: 'help',
    definitions: cli_common_conf
  }, {
    name: 'start',
    definitions: cli_common_conf
  }, {
    name: 'cryo',
    definitions: cli_common_conf
  }, {
    name: 'defrost',
    definitions: cli_common_conf
  }];

  help += getUsage(cli_common_conf, {
    header: ansi.format(ansi.format(header, 'cyan')),
    description: [ansi.format(`${package_desc.name} v${package_desc.version}`, 'bold'), `${package_desc.description}`],
    synopsis: "Those are the common options",
    footer: "=================================="
  });

  help += getUsage([], {
    description: "This Help",
    title: "Command: help",
    synopsis: "The output of this help will change according to installed hooks",
    footer: footer
  });

  help += getUsage([], {
    description: "Start the server",
    title: "Command: start or ''",
    synopsis: "Will start the main receiving server",
    footer: footer
  });

  help += getUsage([], {
    description: "Cryo the hooks, speeding next executions.",
    title: "Command: cryo",
    synopsis: "Will cryo (serialize) the hooks, caching them and speeding next executions",
    footer: footer
  });

  if (config.get("commandline:active") !== false) {
    for (let i = 0; i < cm_hooks.length; i++) {
      let cml = cm_hooks[i];
      if (cml.commandline === true) {
        cla.push({
          name: cml.cmd_name,
          definitions: cli_common_conf
        });
        help += getUsage([], {
          description: cml.description,
          synopsis: cml.help,
          title: `Command: ${cml.cmd_name}`,
          footer: footer
        });
      } else {
        cla.push({
          name: cml.cmd_name,
          definitions: _.extend(cli_common_conf, cml.commandline)
        });
        help += getUsage(cml.commandline, {
          description: cml.description,
          synopsis: cml.help,
          title: `Command: ${cml.cmd_name}`,
          footer: footer
        });
      }
    }
  }

  const cli = commandLineCommands(cla);
  const command = cli.parse();
  tcid = command.telegramid;

  command.name = command.name || "";

  switch (command.name) {
  case 'help':
    console.log(help);
    break
  case '':
    if (process.argv.length > 2) {
      logger.log("Command not recognized");
      return process.exit(1);
    }
  case 'start':
    logger.log(`${package_desc.name} v${package_desc.version} starting...`);
    telegram.init(hooks, tcid).then(express.init).then(function () {
      logger.log(`${package_desc.name} v${package_desc.version} started.`);
    }).catch(function (error) {
      logger.error(error);
    });
    break
  case 'cryo':
    logger.log(`Freezing hooks...`);
    const Cryo = require('cryo');
    const frozen = Cryo.stringify(hooks);
    const savefile = Promise.denodeify(require('fs').writeFile);
    const path = require('path');
    const dir = path.resolve(__dirname, '.');
    const hooks_dir = path.resolve(dir, config.get('hooks:folder'));
    savefile(path.resolve(hooks_dir, "hooks.cryo"), frozen);
    break
  default:
    if (config.get("commandline:active") !== false) {
      telegram.init(hooks, tcid).then(commandline.init).then(function () {
        commandline.execute(command.name, command.options).then().catch(function () {
          logger.error(error);
        }).finally(function () {
          process.exit();
        })
      }).catch(function (error) {
        logger.error(error);
      });
    }
    break
  }
}).catch(function (error) {
  logger.error(error);
});
