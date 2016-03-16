"use strict";

const config = require('./config');
const logger = require('./logger');

const _ = require('underscore');
const s = require("underscore.string");
_.mixin(s.exports());

const Promise = require('promise');
const Express = require("express");

var api = null;
var express_hooks = {};

const express_service = {
  init: function(params){
    api = params.api;
    let hooks = params.hooks;

    express_hooks = _.indexBy(hooks.filter(function (el) {
      return el.has_web_hook
    }), "route_path");

    let promise = new Promise(function (resolve, reject) {
      if(_.values(express_hooks).length > 0){

      }else{
        resolve(true);
      }
    });

    return promise;
  }
};

module.exports = express_service;
