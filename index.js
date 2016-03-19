"use strict";

const config = require('./code/config');
const Main = require('./code/main');
const logger = require('./code/logger');

Main.main(config).then(function (result) {
  if (result) {
    logger.log(result);
  }
  process.exit(0);
}).catch(function (error) {
  if (error) {
    logger.error(error);
  }
  process.exit(1);
});
