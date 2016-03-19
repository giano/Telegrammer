"use strict";

const Promise = require('promise');
const commandLineCommands = require('command-line-commands');
const getUsage = require("command-line-usage");
const telegram = require('./telegram');
const hooks = require('./hooks');
const express = require('./express');
const monitor = require('./monitor');
const logger = require('./logger');
const rpc = require('./rpc');
const ansi = require('ansi-escape-sequences');
const package_desc = require('../package.json');

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

let cm_hooks = null;
let tcid = null;

const cli_common_conf = [{
  name: 'verbose',
  alias: 'v',
  type: Boolean
}, {
  name: 'telegramid',
  alias: 'T',
  type: String
}];

let monitor_control_def = _.union([], cli_common_conf, [{
  name: 'hook',
  alias: 'H',
  type: String,
  defaultOption: true
}]);

let help_def = _.union([], cli_common_conf, [{
  name: 'hook',
  alias: 'H',
  type: String,
  defaultOption: true
}]);

const main = {
  help: function (config, hook_name, cm_hooks) {
    let promise = new Promise(function (resolve, reject) {

      let help = "";
      let footer = "-----------------------------";
      hook_name = hook_name || "";

      let header = [
        "",
        ansi.format(ansi.format(require('../assets/ansi-header'), 'cyan')),
        "",
        ansi.format(`${package_desc.name} v${package_desc.version}`, 'bold'),
        `${package_desc.description}`,
        ""
      ];

      if (hook_name) {
        switch (hook_name) {
        case "help":
          help = getUsage(help_def, {
            header: header,
            description: "This Help",
            title: "Command: help",
            synopsis: "The output of this help will change according to installed hooks"
          });
          break;
        case "start":
          help = getUsage(cli_common_conf, {
            header: header,
            description: "Start the server",
            title: "Command: start",
            synopsis: "Will start the main receiving server"
          });
          break;
        case "reload":
          help = getUsage(cli_common_conf, {
            header: header,
            description: "Reload hooks",
            title: "Command: reload",
            synopsis: "Will reload hook in the main server"
          });
          break;
        case "stop":
          help = getUsage(cli_common_conf, {
            header: header,
            description: "Stop the server",
            title: "Command: stop",
            synopsis: "Will stop the main receiving server"
          });
          break;
        case "monitor:start":
          help = getUsage(monitor_control_def, {
            header: header,
            description: "Start a monitor",
            title: "Command: monitor:start",
            synopsis: "Will start a monitoring hook"
          });
          break;
        case "monitor:stop":
          help = getUsage(monitor_control_def, {
            header: header,
            description: "Stop a monitor",
            title: "Command: monitor:stop",
            synopsis: "Will stop a monitoring hook"
          });
          break;
        case "monitor:restart":
          help = getUsage(monitor_control_def, {
            header: header,
            description: "Restart a monitor",
            title: "Command: monitor:restart",
            synopsis: "Will restart a monitoring hook"
          });
          break;
        default:
          if (config.get("commandline:active") !== false) {
            for (let i = 0; i < cm_hooks.length; i++) {
              let cml = cm_hooks[i];
              if (_.isArray(cml.params)) {
                help = getUsage(_.union([], cli_common_conf, cml.params), {
                  header: header,
                  description: cml.description,
                  synopsis: cml.help,
                  title: `Command: ${cml.cmd_name}`
                });
                break;
              } else {
                help = getUsage(cli_common_conf, {
                  header: header,
                  description: cml.description,
                  synopsis: cml.help,
                  title: `Command: ${cml.cmd_name}`
                });
                break;
              }
            }
          }
          break;
        }
      } else {
        let commands = ["help", "start", "stop", "monitor:start", "monitor:stop", "monitor:restart"];
        if (config.get("commandline:active") !== false) {
          for (let i = 0; i < cm_hooks.length; i++) {
            let cml = cm_hooks[i];
            commands.push(cml.cmd_name);
          }
        }
        help = getUsage([], {
          header: header,
          synopsis: [
            ansi.format(`${commands.length} commands defined:`, 'bold'),
            "",
            commands.join(", "),
            "",
            footer,
            "",
            "use command " + ansi.format('help', 'cyan') + " followed by " + ansi.format('command name', 'cyan') + " to print command specific help"
          ]
        });
      }
      return resolve(help);
    });
    return promise;
  },

  parse_commands: function (config, cmd_arguments, cm_hooks) {
    let promise = new Promise(function (resolve, reject) {
      const commandline = require('./commandline');

      let cla = [{
        name: 'help',
        definitions: help_def
      }, {
        name: 'start',
        definitions: cli_common_conf
      }, {
        name: 'stop',
        definitions: cli_common_conf
      }, , {
        name: 'reload',
        definitions: cli_common_conf
      }, {
        name: 'monitor:start',
        definitions: monitor_control_def
      }, {
        name: 'monitor:stop',
        definitions: monitor_control_def
      }, {
        name: 'monitor:restart',
        definitions: monitor_control_def
      }];

      if (config.get("commandline:active") !== false) {
        for (let i = 0; i < cm_hooks.length; i++) {
          let cml = cm_hooks[i];
          if (_.isArray(cml.params)) {
            cla.push({
              name: cml.cmd_name,
              definitions: _.union([], cli_common_conf, cml.params)
            });
          } else {
            cla.push({
              name: cml.cmd_name,
              definitions: cli_common_conf
            });
          }
        }
      }

      const cli = commandLineCommands(cla);

      let command_line_res = null;

      try {
        if (cmd_arguments) {
          command_line_res = cli.parse(cmd_arguments);
        } else {
          command_line_res = cli.parse();
        }
      } catch (e) {
        console.log(e)
      }

      const command = _.extend({}, command_line_res);

      tcid = command.telegramid;

      command.name = command.name || "";
      command.options = command.options || {};

      resolve(command);
    });
    return promise;
  },

  start_server: function () {
    let promise = new Promise(function (resolve, reject) {
      hooks.load().then(function (hooks) {
        cm_hooks = hooks.filter(function (el) {
          return el.has_command_line_hook
        });

        const npid = require('npid');
        const pid = npid.create('./.pid', true);
        pid.removeOnExit();
        process.on('uncaughtException', function (err) {
          pid.remove();
          return reject(err);
        });
        process.on('SIGINT', function () {
          pid.remove();
          resolve(`${package_desc.name} v${package_desc.version} stopped.`);
        });
        logger.log(`${package_desc.name} v${package_desc.version} starting...`);

        return telegram.init(hooks, tcid).then(monitor.init).then(express.init).then(rpc.init).then(function () {
          logger.log(`${package_desc.name} v${package_desc.version} started.`);
        }).catch(function (error) {
          reject(error);
        });

      }).catch(reject);
    });

    return promise;
  },

  main: function (config, cmd_arguments) {
    let promise = new Promise(function (resolve, reject) {
      hooks.load().then(function (hooks) {
        cm_hooks = hooks.filter(function (el) {
          return el.has_command_line_hook
        });

        return main.parse_commands(config, cmd_arguments, cm_hooks).then(function (command) {
          switch (command.name) {

          case 'help':
            main.help(config, command.options.hook, cm_hooks).then(resolve).catch(reject);
            break
          case '':
            return reject(new Error("No command specified"));
          case 'monitor:start':
            rpc.send("start_monitor", command.options.hook).then(resolve).catch(reject);
            break
          case 'monitor:stop':
            rpc.send("stop_monitor", command.options.hook).then(resolve).catch(reject);
            break
          case 'reload':
            rpc.send("reload").then(resolve).catch(reject);
            break
          case 'monitor:restart':
            rpc.send("restart_monitor", command.options.hook).then(resolve).catch(reject);
            break
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
                    if (error) {
                      return reject(error);
                    }
                    if (stderr.length > 0) {
                      return reject(stderr.toString('utf8'));
                    } else {
                      logger.log(`${package_desc.name} v${package_desc.version} has been stopped.`);
                    }
                    resolve(true);
                  });
                } else {
                  resolve(false);
                }
              });
              return promise;
            }).catch(function (error) {
              if (error.code != "ENOENT") {
                logger.error(error);
              } else {
                logger.log(`${package_desc.name} v${package_desc.version} is not running.`);
              }
            }).finally(function () {
              resolve();
            });
            break;
          case 'start':
            return main.start_server().then(resolve).catch(reject);
            break
          default:
            if (config.get("commandline:active") !== false) {
              telegram.init(hooks, tcid).then(commandline.init).then(function () {
                commandline.execute(command.name, command.options).then(resolve).catch(reject)
              }).catch(function (error) {
                logger.error(error);
              });
            }
            break
          }
        });
      }).catch(reject);
    });
    return promise;
  }
}

module.exports = main;
