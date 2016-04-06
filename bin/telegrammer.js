#! /usr/bin/env node

(function () {
    var _ = require("lodash");
    var args = _.rest(_.toArray(process.argv), 2);
    var path = require('path');
    var index_path = path.resolve(__dirname, '..', "index.js");
    var execFile = require('child_process').execFile;
    var max_mem = process.env.MAX_MEM;
    args.unshift(index_path);
    if (max_mem) {
        args.unshift("--max-old-space-size=" + max_mem);
    }
    var child = execFile('node', args);
    child.unref();
    child.stdout.on('data', function (data) {
        console.log(data.toString());
    });
    child.stderr.on('data', function (data) {
        console.log(data.toString());
    });
})();
