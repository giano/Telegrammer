"use strict";

const config = require('./config');
const Promise = require('promise');

module.exports = {
  load: function () {
    let promise = new Promise(function (resolve, reject) {
      const path = require('path');
      const dir = path.resolve(__dirname, '..');
      const hooks_dir = path.resolve(dir, config.get("hooks:folder"));
      const dotfiles = require('glob-fs-dotfiles');
      const glob = require('glob-fs')({
          cwd: hooks_dir,
          root: hooks_dir
        })
        .exclude('node_modules')
        .use(dotfiles());
      const hooks_pattern = `**/*.(js|json|coffee)`;
      glob.readdirPromise(hooks_pattern).then(function (matches) {
        console.log(matches);
        matches = matches || [];
        let matches_out = [];
        resolve(matches_out);
      }).catch(function (err) {
        reject(err);
      });
    });
    return promise;

  }
}
