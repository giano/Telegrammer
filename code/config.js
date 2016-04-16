'use strict';

/**
 * Config
 * @description Load config files cascading from command line, environment variables to json/js files in config path
 * @namespace Config
 */

/**
 * @class
 * @classdesc Load config files cascading from command line, environment variables to json/js files in config path
 */


const Config = require('nconf');
const _ = require('lodash');
const s = require('underscore.string');
const fs = require('fs');
_.mixin(s.exports());

const path = require('path');
const user_home = process.env.HOME || process.env.USERPROFILE;
const default_config_dir = process.env.TEL_CONFIG_DIR || path.resolve(__dirname, '..', 'config');

/**
 * @property {Boolean} initialized If initialized
 * @private
 * @memberof Config
 */
let initialized = false;

/**
 * @function init
 * @description Initialize config manager
 * @static
 * @param {String} config_dir Config dir path
 * @memberof Config
 * @public
 * @returns {Config}
 */

function init(config_dir) {
  let statSync = fs.lstatSync(config_dir);

  Config.argv();
  if (statSync.isDirectory()) {
    const env = (Config.get('environment') || process.env.NODE_ENV || 'development').toLowerCase();
    Config
      .add('env_js', {
        type: 'file',
        readOnly: true,
        file: path.resolve(config_dir, `${env}.js`)
      }).add('env_json', {
        type: 'file',
        readOnly: true,
        file: path.resolve(config_dir, `${env}.json`)
      }).add('shared_js', {
        type: 'file',
        readOnly: true,
        file: path.resolve(config_dir, 'shared.js')
      }).add('shared_json', {
        type: 'file',
        readOnly: true,
        file: path.resolve(config_dir, 'shared.json')
      }).add('home_js', {
        type: 'file',
        readOnly: true,
        file: path.resolve(user_home, `.telegrammer.js`)
      }).add('home_json', {
        type: 'file',
        readOnly: true,
        file: path.resolve(user_home, `.telegrammer.json`)
      });
  } else if (statSync.isFile()) {
    Config.file({
      file: config_dir
    });
  }
  Config.env('__');

  for (let key in Config.stores) {
    let store = Config.stores[key];
    if (store.type === 'file') {
      store.loadSync();
    }
  }
  Config.load_from = init;
  initialized = true;
  return Config;
}

if (!initialized) {
  init(default_config_dir);
}

module.exports = Config;
