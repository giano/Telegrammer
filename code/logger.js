"use strict";

/**
 * Logger
 * @namespace Logger
 * @description Manages logging. Extends console
 */

const config = require('./config');

const _ = require('underscore');
const s = require("underscore.string");
const ansi = require('ansi-escape-sequences');
const fs = require('fs');

_.mixin(s.exports());

/**
 * @class
 * @classdesc Manages logging. Extends console
 * @extends console
 */

let log_file_path = (config.get("logfile") || "");

function formatForLogFile(){
  let msg = _.toArray(arguments).join("\n");
  return (new Date()).toISOString() + " - " + _.trim(msg) + "\n";
}

const Logger = _.extend({}, console, {
  /**
   * @function setLogFile
   * @description Set log file to write to. Pass empty if you want to redirect to console.
   * @static
   * @param {String} log_file Absolute path to file
   * @memberof Logger
   * @public
   */
    set_log_file: function(log_file){
      log_file_path = log_file || "";
      config.set("logfile", log_file_path);
    },
    /**
     * @function notify
     * @description Logger will only write those messages if verbose is on
     * @static
     * @memberof Logger
     * @param {String} message Message to be traced
     * @public
     */
    notify: function (message) {
        if (config.get("verbose")) {
            process.nextTick(function () {
                Logger.log(ansi.format(message, "yellow"));
            });
        }
    },
    /**
     * @function error
     * @description Error logging override
     * @static
     * @memberof Logger
     * @param {Error} error Exception to be traced
     * @public
     */
    error: function (error) {
        if (error) {
            Logger.trace();
            var error_msg = ansi.format(_.trim(error.message || error), "red");
            if (log_file_path) {
                try {
                    fs.appendFile(log_file_path, formatForLogFile(error_msg));
                } catch (e) {

                }
            } else {
                console.error(error_msg);
            }
        }
    },
    /**
     * @function log
     * @description Log override
     * @static
     * @memberof Logger
     * @param {Error} error Exception to be traced
     * @public
     */
    log: function () {
        if (log_file_path) {
            try {
                fs.appendFile(log_file_path, formatForLogFile.apply(null, _.toArray(arguments)));
            } catch (e) {

            }
        } else {
            console.log.apply(console, _.toArray(arguments));
        }
    },
    /**
     * @function trace
     * @description Trace logging override
     * @static
     * @memberof Logger
     * @public
     */
    trace: function () {
        if (config.get("verbose")) {
            if (log_file_path) {
                try {
                    let stack = new Error().stack;
                    fs.appendFile(log_file_path, formatForLogFile(stack));
                } catch (e) {

                }
            } else {
                console.trace.apply(trace, _.toArray(arguments));
            }
        }
    }
});

module.exports = Logger;
