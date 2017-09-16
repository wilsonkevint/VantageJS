"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require('moment');
const http = require('http');
const os = require('os');
const emailjs = require('emailjs');
const VPDevice_1 = require("./VPDevice");
const VPCurrent_1 = require("./VPCurrent");
const VPHiLow_1 = require("./VPHiLow");
const VPBase_1 = require("./VPBase");
const Wunderground_1 = require("./Wunderground");
const Common = require("./Common");
const MongoDB_1 = require("./MongoDB");
const events_1 = require("events");
const QueryEngine_1 = require("./QueryEngine");
const CWOP_1 = require("./CWOP");
class VantageWs {
    constructor(config) {
        this.config = config;
        this.eventEmitter = new events_1.EventEmitter();
        this.mongo = new MongoDB_1.default(config);
        this.wu = new Wunderground_1.default(config, this.mongo);
    }
    init() {
        var promise = new Promise((resolve, reject) => {
            setTimeout(() => {
                this.mongo.connect().then(() => {
                    this.queryEngine = new QueryEngine_1.default(this.config, this.mongo);
                    if (this.config.runVWS == "1") {
                        var comPort = this.config[os.platform() + '_serialPort'];
                        this.device = new VPDevice_1.default(comPort);
                        this.device.onOpen = () => {
                            this.isActive = true;
                            resolve();
                        };
                    }
                    else
                        resolve();
                }, err => reject(err));
            }, 5000);
        });
        return promise;
    }
    start() {
        this.sendEmail('VantageJS app started');
        this.getAlerts();
        this.getTime(dt => {
            if (dt) {
                if (Math.abs(VPBase_1.default.timeDiff(dt, 's')) > 10) {
                    this.setTime();
                }
            }
            else
                Common.Logger.error('getTime failed');
        });
        setTimeout(() => this.hiLowArchive(), 3000);
        this.hilowInterval = setInterval(() => this.hiLowArchive(), this.config.hilowInterval);
        this.loopInterval = setInterval(() => this.startLoop(), this.config.loopInterval);
    }
    startLoop() {
        if (!this.pauseTimer) {
            if (this.current == null || VPBase_1.default.timeDiff(this.current.dateLoaded, 's') > 5) {
                this.device.isAvailable().then(() => {
                    this.device.wakeUp().then(result => {
                        this.device.writeLoop(99, () => {
                            this.processLoop();
                        });
                    }, VantageWs.deviceError);
                }, VantageWs.deviceError);
            }
        }
    }
    stop() {
        clearInterval(this.loopInterval);
        this.device.wakeUp(); //clear loop
    }
    processLoop() {
        var data = this.device.serialData;
        var startx = data.length == 99 ? 0 : 1;
        if (VPDevice_1.default.validateCRC(data, startx)) {
            this.current = new VPCurrent_1.default(data);
            this.wu.upload(this.current);
            this.emit('current', this.current);
            if (this.config.debug) {
                console.log('temp:' + this.current.temperature + ' ' + this.current.dateLoaded);
            }
        }
    }
    hiLowArchive() {
        this.pauseLoop(180);
        this.getHiLows(() => {
            this.updateArchives().then(() => {
                this.clearPause();
                if (this.current != null) {
                    this.queryEngine.getRainTotals(moment()).then((rain) => {
                        this.hilows.rain24hour = rain.last24;
                        this.hilows.rain1hour = rain.hourly;
                        this.updateCWOP(this.current, this.hilows);
                    }, VantageWs.deviceError);
                }
                this.updateFromArchive().then(() => {
                }, this.errorHandler);
            }, err => {
                VantageWs.deviceError(err);
                this.clearPause();
            });
        });
    }
    updateCWOP(current, hilows) {
        var cwop = new CWOP_1.default(this.config);
        cwop.update(current, hilows).then(() => {
            console.log('cwop updated');
        }, err => VantageWs.deviceError('cwop error ' + err));
    }
    updateArchives() {
        var promise = new Promise((resolve, reject) => {
            this.mongo.getLast('archive').then((last) => {
                var lastDt = last ? last.archiveDate + ' ' + last.archiveTime : null;
                var lastId = last ? last._id : 0;
                this.device.getArchived(lastDt).then((archives) => {
                    try {
                        archives.forEach((a) => {
                            a._id = moment(a.archiveDate + ' ' + a.archiveTime, 'MM/DD/YYYY HH:mm').unix();
                            if (a._id > lastId) {
                                this.mongo.insert('archive', a).then(res => {
                                    console.log('inserted ' + a.archiveDate + ' ' + a.archiveTime);
                                }, err => {
                                    this.errorHandler(err);
                                    reject(err);
                                });
                            }
                        });
                        resolve();
                    }
                    catch (e) {
                        this.errorHandler(e);
                        reject(e);
                    }
                }, err => {
                    this.errorHandler(err);
                    reject(err);
                });
            }, err => {
                this.errorHandler(err);
                reject(err);
            });
        });
        return promise;
    }
    updateFromArchive() {
        var lastDt = null;
        var dayRain;
        var promise = new Promise((resolve, reject) => {
            this.mongo.find('wuUpdated', { _id: 1 }).next().then(wuUpd => {
                if (wuUpd != null) {
                    var csr = this.mongo.sort('archive', { _id: { $gt: wuUpd.lastUpdate } }, { _id: 1 });
                    csr.toArray().then((archives) => {
                        archives.forEach((arch) => {
                            if (!lastDt || lastDt != arch.archiveDate) {
                                dayRain = 0;
                                lastDt = arch.archiveDate;
                            }
                            if (arch.rainClicks > 0)
                                dayRain += arch.rainClicks / 100;
                            if (arch._id > wuUpd.lastUpdate) {
                                var curr = new VPCurrent_1.default(null);
                                curr.barometer = arch.barometer;
                                curr.dayRain = dayRain;
                                curr.humidity = arch.humidity;
                                curr.rainRate = (arch.rainClicks / 100) * 4; //rainClicks / 100 * archival frequency of every 15 mins
                                curr.temperature = arch.outTemp;
                                curr.windAvg = arch.windAvg;
                                curr.windDir = arch.prevWindDir;
                                curr.windSpeed = arch.windHi;
                                curr.dewpoint = VPCurrent_1.default.fDewpoint(curr.temperature, curr.humidity);
                                curr.wuUpdated = moment(arch.archiveDate + ' ' + arch.archiveTime, "MM/DD/yyyy HH:mm");
                                this.wu.upload(curr);
                                var hilows = new VPHiLow_1.default(null);
                                this.queryEngine.getRainTotals(curr.wuUpdated).then((rain) => {
                                    hilows.rain24hour = rain.last24;
                                    hilows.rain1hour = rain.hourly;
                                    this.updateCWOP(curr, hilows);
                                }, VantageWs.deviceError);
                                Common.Logger.info('updateFromArchive:', curr.wuUpdated.toString());
                            }
                        });
                        resolve();
                    });
                }
            }, err => {
                Common.Logger.error(err);
                reject();
            });
        });
        return promise;
    }
    errorHandler(err) {
        Common.Logger.error(+err);
    }
    getArchives(startDate) {
        var tries = 3;
        var promise = new Promise((resolve, reject) => {
            var getArchive = () => {
                this.device.getArchived(startDate).then((archives) => {
                    resolve(archives);
                }, err => {
                    if (tries > 0) {
                        console.log('getArchives retry due to ', err);
                        getArchive();
                        tries--;
                    }
                    else {
                        Common.Logger.error('getArchives', err);
                        reject(err);
                    }
                });
            };
            getArchive();
        });
        return promise;
    }
    getHiLows(callback) {
        this.device.isAvailable().then(() => {
            this.device.wakeUp().then(result => {
                this.device.getSerial("HILOWS", 438, true).then(data => {
                    if (VPDevice_1.default.validateCRC(data, 0)) {
                        this.hilows = new VPHiLow_1.default(data);
                        this.hilows.dateLoaded = new Date();
                        this.getForecast().then(forecast => {
                            this.forecast = forecast;
                            this.hilows.forecast = this.forecast;
                            this.emit('hilows', this.hilows);
                        }, this.errorHandler);
                        Common.Logger.info('hi temp:' + this.hilows.temperature.dailyHi);
                        callback(this.hilows);
                    }
                }, (err) => { Common.Logger.error(err); callback('error'); });
            });
        }, err => {
            Common.Logger.error('hilows device not available');
            callback('error');
        });
    }
    static deviceError(err) {
        Common.Logger.error(err);
    }
    getForecast() {
        var last;
        var promise;
        if (this.forecast) {
            last = VPBase_1.default.timeDiff(this.forecast.last, 'h');
        }
        if (!last || last >= 4) {
            promise = this.wu.getForecast();
        }
        else {
            promise = Promise.resolve(this.forecast);
        }
        return promise;
    }
    getAlerts() {
        var doalerts = () => {
            this.wu.getAlerts().then(alerts => {
                this.alerts = alerts;
                if (alerts.length) {
                    this.emit('alerts', alerts);
                }
            }, this.errorHandler);
        };
        doalerts();
        setInterval(() => {
            doalerts();
        }, 60000 * 15);
    }
    sendCommand(cmd, callback, binres) {
        this.pauseLoop(2, null);
        this.device.isAvailable().then(() => {
            this.device.wakeUp().then(result => {
                this.device.getSerial(cmd + '\n', 1, false).then(data => {
                    var result = '';
                    if (!binres) {
                        for (var i in data) {
                            result += String.fromCharCode(data[i]);
                        }
                    }
                    else {
                        result = data;
                    }
                    callback(result);
                }, this.errorHandler);
            }, this.errorHandler);
        });
    }
    getTime(cb) {
        this.sendCommand("GETTIME", res => {
            if (res[0] == 6) {
                res.splice(0, 1);
            }
            var secs = res[0];
            var mins = res[1];
            var hrs = res[2];
            var day = res[3];
            var mon = res[4];
            var yr = res[5] + 1900;
            var crc = res.splice(6, 2);
            if (crc.join('') == VPDevice_1.default.getCRC(res).join('')) {
                var dt = new Date(yr, mon - 1, day, hrs, mins, secs);
                cb(dt);
            }
            else
                cb(null);
        }, true);
    }
    setTime() {
        var data = [6];
        var now = new Date();
        data[0] = now.getSeconds();
        data[1] = now.getMinutes();
        data[2] = now.getHours();
        data[3] = now.getDate();
        data[4] = now.getMonth() + 1;
        data[5] = now.getFullYear() - 1900;
        var crc = VPDevice_1.default.getCRC(data);
        Array.prototype.push.apply(data, crc);
        this.sendCommand("SETTIME", (result) => {
            if (result[0] == 6) {
                this.device.getSerial(data, 1, true).then(res => {
                    if (res[0] == 6) {
                        Common.Logger.info('time successfully changed');
                    }
                }, true);
            }
            else {
                Common.Logger.info('time successfully not changed');
            }
        }, true);
    }
    pauseLoop(secs, cb) {
        this.pauseTimer = setTimeout(() => {
            this.pauseTimer = 0;
            if (cb)
                cb();
        }, secs * 1000);
    }
    clearPause() {
        if (this.pauseTimer) {
            clearTimeout(this.pauseTimer);
            this.pauseTimer = 0;
        }
    }
    sendEmail(msg) {
        try {
            if (this.config.smtpServer) {
                var mailsrv = emailjs.server.connect({
                    host: this.config.smtpServer,
                    ssl: false
                });
                var message = {
                    text: msg,
                    from: this.config.emailFrom,
                    to: this.config.emailTo,
                    subject: 'VantageJS'
                };
                mailsrv.send(message, (err, msg) => {
                    //console.log(err || msg);
                });
            }
        }
        catch (e) {
            console.log('sendEmail ' + e);
        }
    }
    emit(name, obj) {
        try {
            this.eventEmitter.emit(name, obj);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
    onCurrent(listener) {
        try {
            this.eventEmitter.on('current', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
    onHighLow(listener) {
        try {
            this.eventEmitter.on('hilows', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
    onAlert(listener) {
        try {
            this.eventEmitter.on('alert', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
    onHistory(listener) {
        try {
            this.eventEmitter.on('history', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
}
exports.default = VantageWs;
//# sourceMappingURL=VantageWS.js.map