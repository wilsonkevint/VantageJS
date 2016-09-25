"use strict";
var vpDevice_1 = require('./vpDevice');
var vpCurrent_1 = require('./vpCurrent');
var vpHiLow_1 = require('./vpHiLow');
var vpBase_1 = require('./vpBase');
var wunderGround_1 = require('./wunderGround');
var moment = require('moment');
var http = require('http');
var Promise = require('promise');
var os = require('os');
var linq = require('linq');
var pauseSecs = 30;
var vantageWS = (function () {
    function vantageWS(comPort, config) {
        this.station = new vpDevice_1.default(comPort);
        var self = this;
        var updateFreqMS = config.updateFrequency * 1000;
        this.config = config;
        this.wu = new wunderGround_1.default(config);
        this.getAlerts();
        this.station.onOpen = function () {
            var ctimer;
            self.getHiLows();
            ctimer = setInterval(function () {
                if (!self.pauseLoop)
                    self.getCurrent();
                else {
                    self.pauseLoop--;
                }
                if (self.pauseLoop != 0)
                    console.log('pauseLoop: ' + self.pauseLoop);
            }, updateFreqMS);
        };
        setInterval(function () {
            self.getHiLows();
        }, 360000);
    }
    vantageWS.prototype.getCurrent = function () {
        var self = this;
        self.station.isAvailable().then(function () {
            self.station.wakeUp().then(function (result) {
                self.station.getData("LOOP 1", 99, true).then(function (data) {
                    if (vpDevice_1.default.validateCRC(data)) {
                        self.current = new vpCurrent_1.default(data);
                        self.wu.upload(self.current);
                        if (self.onCurrent)
                            self.onCurrent(self.current);
                    }
                }, vantageWS.deviceError);
            }, vantageWS.deviceError);
        }, function (err) {
            console.log('hilows device not available');
        });
    };
    vantageWS.prototype.queryArchives = function (key, group) {
        return {
            date: key, min: group.min(), max: group.max()
        };
    };
    vantageWS.prototype.getArchives = function () {
        var self = this;
        self.pauseLoop = 30 / self.config.updateFrequency;
        self.station.getArchived("09/17/2016 00:00", function (archives) {
            var hiTemp;
            var lowTemp;
            hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', self.queryArchives)
                .log("$.date + ' ' + $.min + ' ' + $.max").toJoinedString();
        });
    };
    vantageWS.prototype.getHiLows = function () {
        var self = this;
        self.pauseLoop = 25 / self.config.updateFrequency;
        self.station.isAvailable().then(function () {
            self.station.wakeUp().then(function (result) {
                self.station.getData("HILOWS", 438, true).then(function (data) {
                    if (vpDevice_1.default.validateCRC(data)) {
                        self.hilows = new vpHiLow_1.default(data);
                        self.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');
                        if (self.onHighLow)
                            self.onHighLow(self.hilows);
                        self.getForeCast();
                        self.pauseLoop = 0;
                        console.log('hi temp:' + self.hilows.outTemperature.dailyHi);
                    }
                });
            });
        }, function (err) {
            console.log('hilows device not available');
            self.pauseLoop = 0;
        });
    };
    vantageWS.deviceError = function (err) {
        console.log(err);
    };
    vantageWS.prototype.getForeCast = function () {
        var last;
        var self = this;
        if (this.forecast) {
            last = vpBase_1.default.timeDiff(this.forecast.last, 'h');
        }
        if (!last || last >= 4) {
            this.wu.getForeCast().then(function (forecast) {
                self.forecast = forecast;
                self.hilows.forecast = forecast;
            });
        }
    };
    vantageWS.prototype.getAlerts = function () {
        var self = this;
        var doalerts = function () {
            self.wu.getAlerts().then(function (alerts) {
                self.alerts = alerts;
                if (alerts.length && self.onAlert) {
                    self.onAlert(alerts);
                }
            });
        };
        doalerts();
        setInterval(function () {
            doalerts();
        }, 60000 * 15);
    };
    return vantageWS;
}());
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