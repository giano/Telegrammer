"use strict";

const commandLineCommands = require('command-line-commands');
const getUsage = require("command-line-usage");
const Promise = require('promise');
const config = require('./code/config');
const telegram = require('./code/telegram');
const hooks = require('./code/hooks');
const express = require('./code/express');
const commandline = require('./code/commandline');
const logger = require('./code/logger');
const ansi = require('ansi-escape-sequences');
const header = require('./assets/ansi-header');

const package_desc = require('./package.json');

hooks.load().then(function (hooks) {

  let cm_hooks = hooks.filter(function (el) {
    return el.has_command_line_hook
  });

  let help = "";

  let cla = [{
    name: 'help'
  }, {
    name: 'start'
  }];

  help += getUsage([], {
    header: ansi.format(ansi.format(header, 'white')),
    description: [`${package_desc.name} v${package_desc.version}`,`${package_desc.description}`]
  });

  help += "\n" + getUsage([], {
    description: "This Help",
    title: "Command: help"
  });

  help += "\n" + getUsage([], {
    description: "Start the server",
    title: "Command: start or ''"
  });

  for (let i = 0; i < cm_hooks.length; i++) {
    let cml = cm_hooks[i];
    if (cml.commandline === true) {
      cla.push({
        name: cml.full_name
      });
      help += "\n" + getUsage([], {
        description: cml.description,
        title: `Command: ${cml.cmd_name}`
      });
    } else {
      cla.push({
        name: cml.full_name,
        definitions: cml.commandline
      });
      help += "\n" + getUsage(cml.commandline, {
        description: cml.description,
        title: `Command: ${cml.cmd_name}`
      });
    }
  }

  const cli = commandLineCommands(cla);

  const command = cli.parse();

  command.name = command.name || "";

  switch (command.name) {
  case 'help':
    console.log(help);
    break
  case '':
  case 'start':
    telegram.init(hooks).then(express.init).then(function () {
      logger.log("Server Started");
    }).catch(function (error) {
      logger.error(error);
    });
    break
  default:
    telegram.init(hooks).then(commandline.init).then(function () {
      commandline.execute(command.name, command.options, function (error, result) {
        if (error) {
          logger.error(error);
        } else {
          logger.notify();
        };
      });
    }).catch(function (error) {
      logger.error(error);
    });
    break
  }
}).catch(function (error) {
  logger.error(error);
});
