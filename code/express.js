"use strict";

const config = require('./config');
const Promise = require('promise');
const Express = require("express");

var api = null;
var app = null;
var hooks = null;

module.exports = {
  init: function(telegram_api, hooks){
    let promise = new Promise(function (resolve, reject) {

    });
    return promise;
  }
}
