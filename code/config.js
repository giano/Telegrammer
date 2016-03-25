"use strict";

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
const path = require('path');
const dir = path.resolve(__dirname, '..');
const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

Config.argv().env('__');

const env = (Config.get('NODE_ENV') || process.NODE_ENV || "development").toLowerCase();

Config.add("env_js", {
    type: 'file',
    readOnly: true,
    file: path.resolve(dir, `config/${env}.js`)
  })
  .add("env_json", {
    type: 'file',
    readOnly: true,
    file: path.resolve(dir, `config/${env}.json`)
  })
  .add("shared_js", {
    type: 'file',
    readOnly: true,
    file: path.resolve(dir, 'config/shared.js')
  })
  .add("shared_json", {
    type: 'file',
    readOnly: true,
    file: path.resolve(dir, 'config/shared.json')
  });

for (let key in Config.stores) {
  let store = Config.stores[key];
  if (store.type == 'file') {
    store.loadSync();
  }
}

module.exports = Config;
