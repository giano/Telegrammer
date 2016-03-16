module.exports = {
  match: "beep",
  action: function (message, service, matches, cb) {
    console.log('\u0007');
    cb(null);
  },
  error: "Something wrong happened: @error@",
  response: "Ok, beeped!"
}
