'use strict';
const vows = require('vows');
const assert = require('assert');

vows.describe('Config').addBatch({
  'Test config': {
    topic: function () {
      process.env.NODE_ENV = 'test';
      return require('../code/config.js');
    },
    'Can be read': function (config) {
      assert.equal(config.get('leave_me_here_for_tests'), true);
    },
    'Allows tree traversing': function (config) {
      assert.ok(config.get('hooks:folder'));
    },
    'Has Telegram Token set': function (config) {
      assert.ok(config.get('telegram:token'));
    },
    'Allows setting': function (config) {
      config.set('just_a_test', true);
      assert.ok(config.get('just_a_test'));
    }
  }
}).export(module);
