'use strict';

const vows = require('vows');
const assert = require('assert');
const Promise = require('promise');
let main_arguments = ["start"];
let main_promise = null;

vows.describe('Start Command').addBatch({
  'Test telegrammer starting': {
    topic: function () {
      let main_service = require('../code/main.js');
      return main_service;
    },
    'Loaded Main': function (main_service) {
      assert.ok(main_service);
    },
    'Starts': {
      topic: function (main_service) {
        let cb = this.callback;
        main_service.on('started', function (main_service) {
          cb(null, main_service);
        });
        main_promise = main_service.start_server().catch(cb);
      },
      'Started Evenly': function (error, main_service) {
        assert.isNull(error);
        assert.ok(main_service);
      },
      'Stops': {
        topic: function (main_service) {
          let cb = this.callback;
          main_promise.then(function () {
            cb(null, true);
          });
          main_service.stop_server().catch(cb);
        },
        'Stopped Evenly': function (error, is_stopped) {
          assert.isNull(error);
          assert.ok(is_stopped);
        }
      }
    }
  }
}).export(module);
