const config = require('./config');
const engine_name = config.get('engine') || './engines/telegram';
const my_engine = require(engine_name);

module.exports = my_engine;
