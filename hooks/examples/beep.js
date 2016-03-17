"use strict";

module.exports = {
  match: /beep(?:\s+(\d+)\s+times)*/i,
  action: function (message, service, matches, cb) {
    let times = (matches[1] || 1) * 1;
    for (let i = 0; i < times; i++) {
      console.log('\u0007');
    }
    cb(null);
  },
  description: "This hook will simply beep on the server/device",
  error: "Something wrong happened: @error@",
  response: "What was that? Did you hear it?"
}
