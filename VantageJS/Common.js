"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require('moment');
class Util {
    static padZero(num, len) {
        if (num.toString().length >= len)
            return num;
        return (Math.pow(10, len) + Math.floor(num)).toString().substring(1);
    }
    static round(nbr, decimals) {
        if (typeof nbr == 'string') {
            nbr = parseFloat(nbr);
        }
        if (!decimals) {
            decimals = 0;
        }
        if (nbr == null || nbr == undefined)
            return null;
        return parseFloat(nbr.toFixed(decimals));
    }
}
exports.Util = Util;
class Logger {
    static init(filename) {
        Logger.winston = require('winston');
        Logger.winston.add(Logger.winston.transports.File, { filename: filename });
    }
    static info(...args) {
        var dt = moment().format('MM/DD HH:mm:ss');
        Logger.winston.log('info', dt, args);
    }
    static warn(...args) {
        Logger.winston.log('warn', args);
    }
    static error(...args) {
        var dt = moment().format('MM/DD HH:mm:ss');
        Logger.winston.log('error', dt, args);
    }
    static debug(...args) {
        Logger.winston.log('debug', args);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Common.js.map