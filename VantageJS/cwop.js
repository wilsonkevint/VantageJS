"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require('net');
var moment = require('moment');
const MongoDB_1 = require("./MongoDB");
const Common = require("./Common");
class CWOP {
    constructor(config, current) {
        this.config = require('./VantageJS.json');
        this.mongo = new MongoDB_1.default(config);
        this.current = current;
        this.client = new net.Socket();
    }
    update() {
        var Util = Common.Util;
        this.tot24rain = 0;
        this.getRain().then(() => {
            this.client.connect(14580, 'cwop.aprs.net', () => {
                console.log('Connected to cwop');
                this.client.write('user ' + this.config.CWOPId + ' pass -1 vers VantageJS 1.0\r\n');
            });
            this.client.on('data', data => {
                this.dataReceived(data);
            });
            this.client.on('close', () => {
                console.log('cwop Connection closed');
            });
        });
    }
    getRain() {
        var now = moment();
        var yday = now.add(-30, 'days').unix();
        var hourAgo = now.add(-1, 'hours').unix();
        var promise = new Promise((resolve, reject) => {
            this.mongo.connect().then(() => {
                this.mongo.sum('archive', 'rainClicks', { _id: { $gte: yday } }, (err, res) => {
                    if (!err) {
                        this.tot24rain = res[0].total;
                    }
                    else {
                        Common.Logger.error(err);
                        reject();
                    }
                    this.mongo.sum('archive', 'rainClicks', { _id: { $gte: hourAgo } }, (err, res) => {
                        if (!err) {
                            this.hourlyrain = res[0].total;
                            resolve();
                        }
                        else {
                            Common.Logger.error(err);
                            reject();
                        }
                    });
                });
            }, err => {
                Common.Logger.error(err);
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
                + 'r' + this.formatNum(this.hourlyrain, 3)
                + 'p' + this.formatNum(this.tot24rain, 3)
                + 'P' + this.formatNum(this.current.dayRain * 100, 3)
                + 'b' + this.formatNum(baromb, 5)
                + 'h' + this.formatNum(humidity, 2);
            console.log(updateStr);
            try {
                this.client.write(updateStr + '\n\r');
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