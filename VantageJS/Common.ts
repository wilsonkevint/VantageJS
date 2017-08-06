declare function require(name: string);
const moment = require('moment'); 
import VPCurrent from './VPCurrent';
import VPArchive from './VPArchive';
import MongoDB from './MongoDB';
import Wunderground from './Wunderground';

export class Util {

    static padZero(num: number, len: number) {
        if (num.toString().length >= len) return num;
        return (Math.pow(10, len) + Math.floor(num)).toString().substring(1);
    }

    static round(nbr, decimals) {
        if (typeof nbr == 'string') {
            nbr = parseFloat(nbr);
        }
        if (!decimals) {
            decimals = 0;
        }
        return parseFloat(nbr.toFixed(decimals));
    }  
}

export class Logger {
    static winston: any;
    static init(filename: string) {
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

 
