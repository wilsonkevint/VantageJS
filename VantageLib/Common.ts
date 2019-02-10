declare function require(name: string);
const moment = require('moment'); 

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

        if (nbr == null || nbr == undefined)
            return null;

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
        var dt = moment().format('MM/DD HH:mm:ss'); 
        Logger.winston.log('info', dt, args);
    }

    static warn(...args) {
        var dt = moment().format('MM/DD HH:mm:ss'); 
        Logger.winston.log('warn',dt, args);
    }

    static error(...args) {
        var dt = moment().format('MM/DD HH:mm:ss');         
        Logger.winston.log('error', dt,args);
    }

    static debug(...args) {
        var dt = moment().format('MM/DD HH:mm:ss'); 
        Logger.winston.log('debug',dt, args);
    }
}

 
