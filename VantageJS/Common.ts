declare function require(name: string);

export default class Logger {
    static winston: any;
    static init(filename:string) {
        Logger.winston = require('winston');
        Logger.winston.add(Logger.winston.transports.File, { filename: filename });
    }
    static info(...args) {
        Logger.winston.log('info',args);
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