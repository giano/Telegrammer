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
_.mixin(s.exports());

/**
 * @class
 * @classdesc Manages logging. Extends console
 * @extends console
 */

const Logger = _.extend({}, console, {
    /**
     * @function notify
     * @description Logger will only write those messages if verbose is on
     * @static
     * @memberof Logger
     * @public
     */
    notify: function (message) {
        if (config.get("verbose")) {
            process.nextTick(function () {
                console.log(ansi.format(_.clean(message), "yellow"));
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
            var error_msg = ansi.format(_.clean(error.message || error), "red");
            console.error(error_msg);
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
            console.trace.apply(trace, _.toArray(arguments));
        }
    }
});

module.exports = Logger;
