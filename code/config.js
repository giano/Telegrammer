"use strict";

const nconf = require('nconf');
const path = require('path');
const dir = path.resolve(__dirname, '..');
const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

nconf.argv().env('__');

const env = (nconf.get('NODE_ENV') || process.NODE_ENV || "development").toLowerCase();

nconf.add("env_js", {
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

for (let key in nconf.stores) {
  let store = nconf.stores[key];
  if (store.type == 'file') {
    store.loadSync();
  }
}

module.exports = nconf;
