'use strict';
const vows = require('vows');
const chai = require('chai');
chai.should();
const assert = chai.assert;

vows.describe('Config').addBatch({
  'Test config': {
    topic: function () {
      process.env.NODE_ENV = 'test';
      let config = require('../code/config.js');
      this.callback(null, config);
    },
    'Can be read': function (err, config) {
      assert.equal(config.get('leave_me_here_for_tests'), true);
    },
    'Allows tree traversing': function (err, config) {
      assert.ok(config.get('hooks:folder'));
    },
    'Has Telegram Token set': function (err, config) {
      assert.ok(config.get('telegram:token'));
    },
    'Allows setting': function (err, config) {
      config.set('just_a_test', true);
      assert.ok(config.get('just_a_test'));
    }
  }
}).export(module);
