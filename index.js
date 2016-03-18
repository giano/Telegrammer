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
    name: 'stop',
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
    title: "Command: start",
    synopsis: "Will start the main receiving server",
    footer: footer
  });

  help += getUsage([], {
    description: "Stop the server",
    title: "Command: stop",
    synopsis: "Will stop the main receiving server",
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
    logger.log("No command specified");
    return process.exit(1);
  case 'stop':
    let fs = require('fs');
    let terminate = Promise.denodeify(require('terminate'));
    const read = Promise.denodeify(fs.readFile);
    let mainpid = "";
    read('./.pid', 'utf8').then(function (running_pid) {
      mainpid = running_pid;
      return Promise.resolve(mainpid);
    }).then(terminate).then(function (done) {
      let promise = new Promise(function (resolve, reject) {
        if (done) {
          const exec = require('child_process').exec;
          exec(`kill -2 ${mainpid}`, function (error, stdout, stderr) {
            if(error){
              return reject(error);
            }
            if(stderr.length > 0){
              return reject(stderr.toString('utf8'));
            }
            resolve(true);
          });
        } else {
          resolve(false);
        }
      });
      return promise;
    }).catch(function (error) {
      logger.error(error);
    }).finally(function(){
      process.exit();
    });
    break;
  case 'start':
    const npid = require('npid');
    const pid = npid.create('./.pid', true);
    pid.removeOnExit();
    process.on('uncaughtException', function (err) {
      pid.remove();
      return process.exit(1);
    });
    process.on('SIGINT', function () {
      logger.log(`${package_desc.name} v${package_desc.version} stopped.`);
      pid.remove();
      process.exit();
    });
    logger.log(`${package_desc.name} v${package_desc.version} starting...`);
    telegram.init(hooks, tcid).then(express.init).then(function () {
      logger.log(`${package_desc.name} v${package_desc.version} started.`);
    }).catch(function (error) {
      logger.error(error);
      process.exit(1);
    });
    break
  default:
    if (config.get("commandline:active") !== false) {
      telegram.init(hooks, tcid).then(commandline.init).then(function () {
        commandline.execute(command.name, command.options).then().catch(function (error) {
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
