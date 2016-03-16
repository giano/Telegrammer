const config = require('../../code/config');

module.exports = {
  command: "list",
  action: function (message, service, matches, cb) {
    cb(null, `${config.get("telegram:device_name_char")}${config.get("device_name")}`);
  },
  response: true
}
