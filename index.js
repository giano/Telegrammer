"use strict";

const Promise = require('promise');
const config = require('./code/config');
const telegram = require('./code/telegram');
const hooks = require('./code/hooks');
const express = require('./code/express');

hooks.load().then(telegram.init).then(express.init).catch(function(error){
  console.log(error);
});
