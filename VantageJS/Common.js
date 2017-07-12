"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Logger {
    static init(filename) {
        Logger.winston = require('winston');
        Logger.winston.add(Logger.winston.transports.File, { filename: filename });
    }
    static info(...args) {
        Logger.winston.log('info', args);
    }
    static warn(...args) {
        Logger.winston.log('warn', args);
    }
    static error(...args) {
        Logger.winston.log('error', args);
    }
    static debug(...args) {
        Logger.winston.log('debug', args);
    }
}
exports.default = Logger;
//# sourceMappingURL=Common.js.map