"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require('net');
var moment = require('moment');
const Common = require("./Common");
class CWOP {
    constructor(config) {
        this.config = require('./VantageJS.json');
    }
    update(current, hilows) {
        var Util = Common.Util;
        this.cwopUpdated = false;
        this.current = current;
        this.hilows = hilows;
        this.client = new net.Socket();
        var promise = new Promise((resolve, reject) => {
            this.client.connect(14580, 'cwop.aprs.net', () => {
                console.log('Connected to cwop');
                this.client.write('user ' + this.config.CWOPId + ' pass -1 vers VantageJS 1.0\r\n'); //login to cwop
            });
            this.client.on('data', data => {
                this.dataReceived(data);
                if (this.cwopUpdated) {
                    resolve();
                }
            });
            this.client.on('close', () => {
                console.log('cwop Connection closed');
                if (!this.cwopUpdated)
                    reject();
            });
        });
        return promise;
    }
    dataReceived(data) {
        var resp = String.fromCharCode.apply(null, data);
        var timeStr = moment.utc().format('DDHHmm');
        var Util = Common.Util;
        if (resp.indexOf('logresp') > -1) {
            var baromb = this.current.barometer * 33.8637526 * 10;
            var humidity = this.current.humidity == 100 ? 0 : this.current.humidity;
            var updateStr = this.config.CWOPId + '>APRS,TCPIP*:@' + timeStr + 'z'
                + this.config.CWLatitude + '/' + this.config.CWLongitude
                + '_' + this.formatNum(this.current.windDir, 3)
                + '/' + this.formatNum(this.current.windAvg, 3)
                + 'g' + this.formatNum(this.current.windSpeed, 3)
                + 't' + this.formatNum(this.current.temperature, 3)
                + 'r' + this.formatNum(this.hilows.rain1hour, 3)
                + 'p' + this.formatNum(this.hilows.rain24hour, 3)
                + 'P' + this.formatNum(this.current.dayRain * 100, 3)
                + 'b' + this.formatNum(baromb, 5)
                + 'h' + this.formatNum(humidity, 2);
            console.log(updateStr);
            try {
                this.client.write(updateStr + '\n\r');
                this.cwopUpdated = true;
            }
            catch (ex) {
                Common.Logger.error(ex);
            }
            setInterval(() => { this.client.destroy(); }, 5000);
        }
    }
    formatNum(num, len) {
        return Common.Util.padZero(Common.Util.round(num, 0), len);
    }
}
exports.default = CWOP;
//# sourceMappingURL=CWOP.js.map