"use strict";

module.exports = {
  match: "beep",
  action: function (message, service, matches, cb) {
    console.log('\u0007');
    cb(null);
  },
  description: "This hook will simply beep on the server/device",
  error: "Something wrong happened: @error@",
  response: "Ok, beeped!"
}
