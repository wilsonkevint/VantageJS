"use strict";
const vpDevice_1 = require('./vpDevice');
const vpCurrent_1 = require('./vpCurrent');
const vpHiLow_1 = require('./vpHiLow');
const vpBase_1 = require('./vpBase');
const wunderGround_1 = require('./wunderGround');
var moment = require('moment');
var http = require('http');
var os = require('os');
var linq = require('linq');
const pauseSecs = 30;
class vantageWS {
    constructor(comPort, config) {
        this.station = new vpDevice_1.default(comPort);
        var updateFreqMS = config.updateFrequency * 1000;
        this.config = config;
        this.wu = new wunderGround_1.default(config);
        this.getAlerts();
        this.station.onOpen = () => {
            var ctimer;
            this.getHiLows();
            ctimer = setInterval(() => {
                if (!this.pauseLoop)
                    this.getCurrent();
                else {
                    this.pauseLoop--;
                }
                if (this.pauseLoop != 0)
                    console.log('pauseLoop: ' + this.pauseLoop);
            }, updateFreqMS);
        };
        setInterval(() => {
            this.getHiLows();
        }, 360000);
    }
    getCurrent() {
        this.station.isAvailable().then(() => {
            this.station.wakeUp().then(result => {
                this.station.getData("LOOP 1", 99, true).then(data => {
                    if (vpDevice_1.default.validateCRC(data)) {
                        this.current = new vpCurrent_1.default(data);
                        this.wu.upload(this.current);
                        if (this.onCurrent)
                            this.onCurrent(this.current);
                    }
                }, vantageWS.deviceError);
            }, vantageWS.deviceError);
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
        this.station.getArchived("09/17/2016 00:00", archives => {
            var hiTemp;
            var lowTemp;
            hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', this.queryArchives)
                .log("$.date + ' ' + $.min + ' ' + $.max").toJoinedString();
        });
    }
    getHiLows() {
        this.pauseLoop = 25 / this.config.updateFrequency;
        this.station.isAvailable().then(() => {
            this.station.wakeUp().then(result => {
                this.station.getData("HILOWS", 438, true).then(data => {
                    if (vpDevice_1.default.validateCRC(data)) {
                        this.hilows = new vpHiLow_1.default(data);
                        this.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');
                        if (this.onHighLow)
                            this.onHighLow(this.hilows);
                        this.getForeCast();
                        this.pauseLoop = 0;
                        console.log('hi temp:' + this.hilows.outTemperature.dailyHi);
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
            last = vpBase_1.default.timeDiff(this.forecast.last, 'h');
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = vantageWS;
//rl.on('line', (input) => {
//console.log(`Received: ${input}` + input.length);
//  if (input.length == 0)
//	myPort.write('\n'); 
//  else
//	myPort.write(input); 
//});
//# sourceMappingURL=vantageWS.js.map