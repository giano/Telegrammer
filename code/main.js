'use strict';

/**
 * MainService
 * @namespace MainService
 * @description Manages main init function and commands dispatching.
 */

const hooks = require('./hooks');
const telegram = require('./engine');
const express = require('./express');
const monitor = require('./monitor');
const local = require('./local');
const logger = require('./logger');
const rpc = require('./rpc');
const commandline = require('./commandline');
const path = require('path');
const Promise = require('promise');
const commandLineCommands = require('command-line-commands');
const getUsage = require('command-line-usage');
const ansi = require('ansi-escape-sequences');
const package_desc = require('../package.json');

const _ = require('lodash');
const s = require('underscore.string');
_.mixin(s.exports());

let tcid = null;
let pid_path = path.resolve(__dirname, '..', '.pid');

const cli_common_conf = [{
  name: 'verbose',
  alias: 'V',
  type: Boolean
}, {
  name: 'telegramid',
  alias: 'T',
  type: String
}, {
  name: 'token',
  alias: 'K',
  type: String
}, {
  name: 'config-dir',
  type: String
}, {
  name: 'config-file',
  type: String
}, {
  name: 'hooks-dir',
  type: String
}, {
  name: 'log-file',
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

/**
 * @class
 * @classdesc Manages main init function and commands dispatching.
 */

const MainService = {
  /**
   * @function help
   * @description Returns command line help interface.<br/>Will include commandline hooks' help.
   * @static
   * @param {Config} config Link to config manager
   * @param {String} hook_name You can pass a commandline hook name or command to have a detailed help here.
   * @memberof MainService
   * @public
   * @returns {Promise}
   */
  help: function (config, hook_name) {
    return new Promise(function (resolve, reject) {
      hooks.load().then(function () {
        let cm_hooks = hooks.get_hooks('has_command_line_hook');

        let help = '';
        let footer = '-----------------------------';
        hook_name = (hook_name || '');

        let header = [
          '',
          ansi.format(ansi.format(require('../assets/ansi-header'), 'cyan')),
          '',
          ansi.format(`${package_desc.name} v${package_desc.version}`, 'bold'),
          `${package_desc.description}`,
          ''
        ];

        if (hook_name) {
          switch (hook_name) {
          case 'help':
            help = getUsage(help_def, {
              header: header,
              description: 'This Help',
              title: 'Command: help',
              synopsis: 'The output of this help will change according to installed hooks'
            });
            break;
          case 'start':
            help = getUsage(cli_common_conf, {
              header: header,
              description: 'Start the server',
              title: 'Command: start',
              synopsis: 'Will start the main receiving server'
            });
            break;
          case 'reload':
            help = getUsage(cli_common_conf, {
              header: header,
              description: 'Reload hooks',
              title: 'Command: reload',
              synopsis: 'Will reload hook in the main server'
            });
            break;
          case 'stop':
            help = getUsage(cli_common_conf, {
              header: header,
              description: 'Stop the server',
              title: 'Command: stop',
              synopsis: 'Will stop the main receiving server'
            });
            break;
          case 'monitor:start':
            help = getUsage(monitor_control_def, {
              header: header,
              description: 'Start a monitor',
              title: 'Command: monitor:start',
              synopsis: 'Will start a monitoring hook'
            });
            break;
          case 'monitor:stop':
            help = getUsage(monitor_control_def, {
              header: header,
              description: 'Stop a monitor',
              title: 'Command: monitor:stop',
              synopsis: 'Will stop a monitoring hook'
            });
            break;
          case 'monitor:restart':
            help = getUsage(monitor_control_def, {
              header: header,
              description: 'Restart a monitor',
              title: 'Command: monitor:restart',
              synopsis: 'Will restart a monitoring hook'
            });
            break;
          default:
            if (config.get('commandline:active') !== false) {
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
          let commands = ['help', 'start', 'stop', 'reload', 'monitor:start', 'monitor:stop', 'monitor:restart'];
          if (config.get('commandline:active') !== false) {
            for (let i = 0; i < cm_hooks.length; i++) {
              let cml = cm_hooks[i];
              commands.push(cml.cmd_name);
            }
          }
          help = getUsage([], {
            header: header,
            synopsis: [
              ansi.format(`${commands.length} commands defined:`, 'bold'),
              '',
              commands.join(', '),
              '',
              footer,
              '',
              'use command ' + ansi.format('help', 'cyan') + ' followed by ' + ansi.format('command name', 'cyan') + ' to print command specific help'
            ]
          });
        }
        return resolve(help);
      }).catch(reject);
    });
  },
  /**
   * @function parse_commands
   * @description Parse command line arguments and commands
   * @static
   * @param {Config} config Link to config manager
   * @param {Object} cmd_arguments Command arguments override
   * @memberof MainService
   * @public
   * @returns {Promise}
   */
  parse_commands: function (config, cmd_arguments) {
    return new Promise(function (resolve, reject) {
      hooks.load().then(function () {
        let cm_hooks = hooks.get_hooks('has_command_line_hook');

        let cla = [{
          name: 'help',
          definitions: help_def
        }, {
          name: 'start',
          definitions: cli_common_conf
        }, {
          name: 'stop',
          definitions: cli_common_conf
        }, {
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

        if (config.get('commandline:active') !== false) {
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
            logger.notify(`Registered '${cml.full_name}' command line hook with command ${cml.cmd_name}`);
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
          logger.error(e);
        }

        const command = _.extend({}, command_line_res);

        tcid = command.telegramid;

        if (command.token) {
          config.set('telegram:token', command.token);
        }

        if (command['config-dir'] || command['config-file']) {
          config.load_from(command['config-file'] || command['config-dir']);
        }

        if (command['hooks-dir'] && config.get('hooks:folder') != command['hooks-dir']) {
          config.set('hooks:folder', command['hooks-dir']);
          return hooks.reload(command['hooks-dir']).then(function () {
            return parse_command(config, cmd_arguments).then(resolve).catch(reject);
          }).catch(reject);
        }

        command.name = (command.name || '');
        command.options = (command.options || {});

        resolve(command);

      }).catch(reject);

    });
  },
  /**
   * @function start_server
   * @description Starts the service
   * @static
   * @memberof MainService
   * @public
   * @returns {Promise}
   */
  start_server: function () {
    return new Promise(function (resolve, reject) {

      hooks.load().then(function () {
        let cm_hooks = hooks.get_hooks('has_command_line_hook');

        const npid = require('npid');
        const pid = npid.create(pid_path, true);
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

        return telegram.init(tcid).then(local.init).then(monitor.init).then(express.init).then(rpc.init).then(function () {
          logger.log(`${package_desc.name} v${package_desc.version} started.`);
        }).catch(function (error) {
          reject(error);
        });
      }).catch(reject);
    });
  },

  /**
   * @function stop_server
   * @description Stops the service
   * @static
   * @memberof MainService
   * @public
   * @returns {Promise}
   */
  stop_server: function () {
    return new Promise(function (resolve, reject) {
      let fs = require('fs');
      let terminate = Promise.denodeify(require('terminate'));
      const read = Promise.denodeify(fs.readFile);
      let mainpid = '';
      return read(pid_path, 'utf8').then(function (running_pid) {
        mainpid = running_pid;
        return Promise.resolve(mainpid);
      }).then(terminate).then(function (done) {
        return new Promise(function (resolve, reject) {
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
      }).catch(function (error) {
        if (error.code != 'ENOENT') {
          logger.error(error);
        } else {
          logger.log(`${package_desc.name} v${package_desc.version} is not running.`);
        }
      }).finally(function () {
        resolve();
      });
    });
  },
  /**
   * @function main
   * @description Main app
   * @static
   * @param {Config} config Link to config manager
   * @param {Object} cmd_arguments Command arguments override
   * @memberof MainService
   * @public
   * @returns {Promise}
   */

  main: function (config, cmd_arguments) {
    return new Promise(function (resolve, reject) {
      return MainService.parse_commands(config, cmd_arguments).then(function (command) {
        if (command.options.verbose) {
          config.set('verbose', true);
        }
        if (command.options['log-file']) {
          logger.set_log_file(command.options['log-file']);
        }
        switch (command.name) {
        case 'help':
          MainService.help(config, command.options.hook).then(resolve).catch(reject);
          break;
        case '':
          return reject('No command specified');
        case 'monitor:start':
          rpc.send('start_monitor', command.options.hook).then(resolve).catch(reject);
          break;
        case 'monitor:stop':
          rpc.send('stop_monitor', command.options.hook).then(resolve).catch(reject);
          break;
        case 'monitor:restart':
          rpc.send('restart_monitor', command.options.hook).then(resolve).catch(reject);
          break;
        case 'stop':
          return MainService.stop_server().then(resolve).catch(reject);
          break;
        case 'start':
          return MainService.start_server().then(resolve).catch(reject);
          break;
        case 'reload':
          rpc.send('reload_hooks').then(resolve).catch(reject);
          break;
        default:
          if (config.get('commandline:active') !== false) {
            return telegram.init(tcid, true).then(commandline.init).then(function () {
              commandline.execute(command.name, command.options).then(resolve).catch(reject);
            }).catch(function (error) {
              logger.error(error);
            });
          } else {
            reject('Command line not active');
          }
          break;
        }
      }).catch(reject);
    });
  }
};

module.exports = MainService;
