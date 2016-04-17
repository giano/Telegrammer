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
    description: 'Test Message Responder',
    name: 'test',
    command: 'test',
    plain: false,
    enabled: process.env.NODE_ENV === 'test',
    action: function (message, service) {
      return Promise.resolve("Ok, I'm here");
    },
    response: true
  }
];
