"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require('moment');
var http = require('http');
var os = require('os');
var linq = require('linq');
const VPDevice_1 = require("./VPDevice");
const VPCurrent_1 = require("./VPCurrent");
const VPHiLow_1 = require("./VPHiLow");
const VPBase_1 = require("./VPBase");
const Wunderground_1 = require("./Wunderground");
const Common_1 = require("./Common");
const MongoDB_1 = require("./MongoDB");
class VantageWs {
    constructor(comPort, config) {
        this.device = new VPDevice_1.default(comPort);
        var updateFreqMs = config.updateFrequency * 1000;
        this.config = config;
        this.wu = new Wunderground_1.default(config);
        this.getAlerts();
        this.device.onOpen = () => {
            this.start();
        };
        var mongo = new MongoDB_1.default(config);
        mongo.connect().then(() => {
            this.db = mongo.db;
            Common_1.default.info('database connected');
        });
    }
    start() {
        this.hourlyUpdate();
        this.loopTimer = setInterval(() => {
            var last = null;
            if (this.current) {
                last = VPBase_1.default.timeDiff(this.current.dateLoaded, 's');
            }
            if (this.pauseTimer == null && (last == null || last > 5)) {
                this.beginLoop();
            }
            if (this.current) {
                console.log('temp:' + this.current.temperature + ' ' + this.current.dateLoaded);
            }
        }, 2000);
        this.hourlyTimer = setInterval(() => {
            this.hourlyUpdate();
        }, 60 * 60 * 1000);
    }
    beginLoop() {
        this.device.isAvailable().then(() => {
            this.device.wakeUp().then(result => {
                this.device.readLoop(99, data => {
                    if (VPDevice_1.default.validateCRC(data)) {
                        this.current = new VPCurrent_1.default(data);
                        this.wu.upload(this.current);
                        if (this.onCurrent)
                            this.onCurrent(this.current);
                    }
                });
            }, VantageWs.deviceError);
        }, VantageWs.deviceError);
    }
    hourlyUpdate() {
        this.pauseLoop(60);
        this.getHiLows(() => {
            this.updateArchives().then(() => {
                this.pauseLoop(0);
            }, err => {
                this.pauseLoop(0);
            });
        });
    }
    archiveGroupBy(archives) {
        var hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', this.queryArchives);
        hiTemp.forEach(t => {
            console.log(t);
        });
    }
    queryArchives(key, group) {
        return {
            date: key, min: group.min(), max: group.max(), count: group.count()
        };
    }
    updateArchives() {
        var promise = new Promise((resolve, reject) => {
            this.db.collection('archive').find().sort({ "_id": -1 }).limit(1).next().then((max) => {
                var maxId = max._id;
                var maxDtTime = max.archiveDate + ' ' + max.archiveTime;
                this.retrieveArchives(maxDtTime).then((archives) => {
                    try {
                        archives.forEach((a) => {
                            a._id = moment(a.archiveDate + ' ' + a.archiveTime, 'MM/DD/YYYY HH:mm').unix();
                            if (a._id > maxId) {
                                this.db.collection('archive').insert(a).then(res => {
                                    console.log('inserted ' + a.archiveDate + ' ' + a.archiveTime);
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
                    reject(err);
                });
            }, err => {
                reject(err);
            });
        });
        return promise;
    }
    errorHandler(err) {
        Common_1.default.error(err);
    }
    getArchivesDB(startDate) {
        var dt = moment(startDate, 'MM/DD/YYYY HH:mm').unix();
        var promise = new Promise((resolve, reject) => {
            this.db.collection('archive').find({ "_id": { $gte: dt } }).toArray().then(res => {
                resolve(res);
            });
        });
        return promise;
    }
    retrieveArchives(startDate) {
        var promise = new Promise((resolve, reject) => {
            this.device.getArchived(startDate).then((archives) => {
                resolve(archives);
            }, err => {
                Common_1.default.error('getArchives', err);
                reject(err);
            });
        });
        return promise;
    }
    getHiLows(callback) {
        this.device.isAvailable().then(() => {
            this.device.wakeUp().then(result => {
                this.device.getSerial("HILOWS", 438, true).then(data => {
                    if (VPDevice_1.default.validateCRC(data)) {
                        this.hilows = new VPHiLow_1.default(data);
                        this.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');
                        if (this.onHighLow)
                            this.onHighLow(this.hilows);
                        this.getForecast();
                        Common_1.default.info('hi temp:' + this.hilows.temperature.dailyHi);
                        callback(this.hilows);
                    }
                }, (err) => { Common_1.default.error(err); callback('error'); });
            });
        }, err => {
            Common_1.default.error('hilows device not available');
            callback('error');
        });
    }
    static deviceError(err) {
        Common_1.default.error(err);
    }
    getForecast() {
        var last;
        if (this.forecast) {
            last = VPBase_1.default.timeDiff(this.forecast.last, 'h');
        }
        if (!last || last >= 4) {
            this.wu.getForecast().then(forecast => {
                this.forecast = forecast;
                this.hilows.forecast = forecast;
            });
        }
    }
    getAlerts() {
        var doalerts = () => {
            this.wu.getAlerts().then(alerts => {
                this.alerts = alerts;
                if (alerts.length && this.onAlert) {
                    this.onAlert(alerts);
                }
            });
        };
        doalerts();
        setInterval(() => {
            doalerts();
        }, 60000 * 15);
    }
    pauseLoop(pauseSecs) {
        if (pauseSecs == 0 && this.pauseTimer) {
            clearTimeout(this.pauseTimer);
            this.pauseTimer = null;
            return;
        }
        this.pauseTimer = setTimeout(() => {
            this.pauseTimer = null;
        }, pauseSecs * 1000);
    }
    sendCommand(cmd, callback) {
        this.pauseLoop(5);
        this.device.isAvailable().then(() => {
            this.device.wakeUp().then(result => {
                this.device.getSerial(cmd + '\n', 1, false).then(data => {
                    var result = '';
                    for (var i in data) {
                        result += String.fromCharCode(data[i]);
                    }
                    callback(result);
                }, err => {
                });
            });
        });
    }
}
exports.default = VantageWs;
//# sourceMappingURL=VantageWS.js.map