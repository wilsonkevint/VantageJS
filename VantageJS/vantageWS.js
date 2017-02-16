"use strict";
var vpDevice_1 = require('./vpDevice');
var vpCurrent_1 = require('./vpCurrent');
var vpHiLow_1 = require('./vpHiLow');
var vpBase_1 = require('./vpBase');
var wunderGround_1 = require('./wunderGround');
var moment = require('moment');
var http = require('http');
var os = require('os');
var linq = require('linq');
var pauseSecs = 30;
var vantageWS = (function () {
    function vantageWS(comPort, config) {
        var _this = this;
        this.station = new vpDevice_1.default(comPort);
        var updateFreqMS = config.updateFrequency * 1000;
        this.config = config;
        this.wu = new wunderGround_1.default(config);
        this.getAlerts();
        this.station.onOpen = function () {
            var ctimer;
            _this.getHiLows();
            ctimer = setInterval(function () {
                if (!_this.pauseLoop)
                    _this.getCurrent();
                else {
                    _this.pauseLoop--;
                }
                if (_this.pauseLoop != 0)
                    console.log('pauseLoop: ' + _this.pauseLoop);
            }, updateFreqMS);
        };
        setInterval(function () {
            _this.getHiLows();
        }, 360000);
    }
    vantageWS.prototype.getCurrent = function () {
        var _this = this;
        this.station.isAvailable().then(function () {
            _this.station.wakeUp().then(function (result) {
                _this.station.getData("LOOP 1", 99, true).then(function (data) {
                    if (vpDevice_1.default.validateCRC(data)) {
                        _this.current = new vpCurrent_1.default(data);
                        _this.wu.upload(_this.current);
                        if (_this.onCurrent)
                            _this.onCurrent(_this.current);
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
        var _this = this;
        this.pauseLoop = 30 / this.config.updateFrequency;
        var startDate = (moment().add('months', -1).format("MM/DD/YYYY 00:00"));
        this.station.getArchived(startDate, function (archives) {
            var hiTemp;
            var lowTemp;
            console.log(archives);
            hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', _this.queryArchives)
                .log("$.date + ' ' + $.min + ' ' + $.max").toJoinedString();
            if (_this.onHistory)
                _this.onHistory(archives);
        });
    };
    vantageWS.prototype.getHiLows = function () {
        var _this = this;
        this.pauseLoop = 25 / this.config.updateFrequency;
        this.station.isAvailable().then(function () {
            _this.station.wakeUp().then(function (result) {
                _this.station.getData("HILOWS", 438, true).then(function (data) {
                    if (vpDevice_1.default.validateCRC(data)) {
                        _this.hilows = new vpHiLow_1.default(data);
                        _this.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');
                        if (_this.onHighLow)
                            _this.onHighLow(_this.hilows);
                        _this.getForeCast();
                        _this.pauseLoop = 0;
                        console.log('hi temp:' + _this.hilows.outTemperature.dailyHi);
                    }
                });
            });
        }, function (err) {
            console.log('hilows device not available');
            _this.pauseLoop = 0;
        });
    };
    vantageWS.deviceError = function (err) {
        console.log(err);
    };
    vantageWS.prototype.getForeCast = function () {
        var _this = this;
        var last;
        if (this.forecast) {
            last = vpBase_1.default.timeDiff(this.forecast.last, 'h');
        }
        if (!last || last >= 4) {
            this.wu.getForeCast().then(function (forecast) {
                _this.forecast = forecast;
                _this.hilows.forecast = forecast;
            });
        }
    };
    vantageWS.prototype.getAlerts = function () {
        var _this = this;
        var doalerts = function () {
            _this.wu.getAlerts().then(function (alerts) {
                _this.alerts = alerts;
                if (alerts.length && _this.onAlert) {
                    _this.onAlert(alerts);
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