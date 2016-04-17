const config = require('./config');
const engine_name = config.get('engine') || './engines/telegram';

module.exports = require(engine_name);
