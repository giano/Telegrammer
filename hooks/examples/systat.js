"use strict";

/**
 * @alias systat
 * @member {Object} systat
 * @description Example of command line hook linked to non regex command /systat
 * @memberOf hooks/examples
 */

const Promise = require('promise');
const os = require("os");
const memory_command = "free | grep Mem | awk '{print $3/$2 * 100.0}'";

module.exports = {
  command: "systat",
  action: function (message, service, matches) {
    return new Promise(function (resolve, reject) {
      let cpus = os.cpus();
      let out = "";
      let total = 0;
      let used = 0;
      for (var i = 0, len = cpus.length; i < len; i++) {
        var cpu = cpus[i]
        for (let type in cpu.times) {
          total += cpu.times[type];
        }
        used += cpu.times["user"] + cpu.times["nice"] + cpu.times["sys"];
      }
      out += "CPUs (" + cpus.length + "): " + Math.round(100 * used / total) + "%\n";
      const exec = require('child_process').exec;
      let child = exec(memory_command, {}, function (error, stdout, stderr) {
        let stderr_str = stderr.toString('utf8');
        if(!stderr_str){
          out += "Memory Usage: " + (Math.round(stdout.toString('utf8') * 10) / 10) + " %\n";
        }
        resolve(out);
      });

    });
  },
  description: "Example of command line hook linked to non regex command \/systat."
};
