"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const VPDevice_1 = require("./VPDevice");
const VPCurrent_1 = require("./VPCurrent");
const VPHiLow_1 = require("./VPHiLow");
const VPBase_1 = require("./VPBase");
const Wunderground_1 = require("./Wunderground");
var moment = require('moment');
var http = require('http');
var os = require('os');
var linq = require('linq');
const pauseSecs = 30;
class VantageWs {
    constructor(comPort, config) {
        this.station = new VPDevice_1.default(comPort);
        var updateFreqMs = config.updateFrequency * 1000;
        this.config = config;
        this.wu = new Wunderground_1.default(config);
        this.getAlerts();
        this.station.onOpen = () => {
            this.getHiLows();
            var ctimer = setInterval(() => {
                if (!this.pauseLoop)
                    this.getCurrent();
                else {
                    this.pauseLoop--;
                }
                if (this.pauseLoop != 0)
                    console.log('pauseLoop: ' + this.pauseLoop);
            }, updateFreqMs);
        };
        setInterval(() => {
            this.getHiLows();
        }, 360000);
    }
    //getCurrent
    getCurrent() {
        this.station.isAvailable().then(() => {
            this.station.wakeUp().then(result => {
                this.station.getData("LOOP 1", 99, true).then(data => {
                    if (VPDevice_1.default.validateCRC(data)) {
                        this.current = new VPCurrent_1.default(data);
                        this.wu.upload(this.current);
                        if (this.onCurrent)
                            this.onCurrent(this.current);
                    }
                }, VantageWs.deviceError);
            }, VantageWs.deviceError);
        }, err => {
            console.log('hilows device not available');
        });
    }
    queryArchives(key, group) {
        return {
            date: key, min: group.min(), max: group.max()
        };
    }
    getArchives() {
        this.pauseLoop = 30 / this.config.updateFrequency;
        var startDate = (moment().add('months', -1).format("MM/DD/YYYY 00:00"));
        this.station.getArchived(startDate, archives => {
            var lowTemp;
            console.log(archives);
            var hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', this.queryArchives)
                .log("$.date + ' ' + $.min + ' ' + $.max").toJoinedString();
            if (this.onHistory)
                this.onHistory(archives);
        });
    }
    getHiLows() {
        this.pauseLoop = 25 / this.config.updateFrequency;
        this.station.isAvailable().then(() => {
            this.station.wakeUp().then(result => {
                this.station.getData("HILOWS", 438, true).then(data => {
                    if (VPDevice_1.default.validateCRC(data)) {
                        this.hilows = new VPHiLow_1.default(data);
                        this.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');
                        if (this.onHighLow)
                            this.onHighLow(this.hilows);
                        this.getForeCast();
                        this.pauseLoop = 0;
                        console.log('hi temp:' + this.hilows.temperature.dailyHi);
                    }
                });
            });
        }, err => {
            console.log('hilows device not available');
            this.pauseLoop = 0;
        });
    }
    static deviceError(err) {
        console.log(err);
    }
    getForeCast() {
        var last;
        if (this.forecast) {
            last = VPBase_1.default.timeDiff(this.forecast.last, 'h');
        }
        if (!last || last >= 4) {
            this.wu.getForeCast().then(forecast => {
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
}
exports.default = VantageWs;
//rl.on('line', (input) => {
//console.log(`Received: ${input}` + input.length);
//  if (input.length == 0)
//	myPort.write('\n'); 
//  else
//	myPort.write(input); 
//});
//# sourceMappingURL=VantageWS.js.map