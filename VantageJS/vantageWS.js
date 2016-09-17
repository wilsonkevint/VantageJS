"use strict";
var vpDevice_1 = require('./vpDevice');
var vpCurrent_1 = require('./vpCurrent');
var vpHiLow_1 = require('./vpHiLow');
var vpBase_1 = require('./vpBase');
var moment = require('moment');
var http = require('http');
var Promise = require('promise');
var os = require('os');
var pauseSecs = 30;
var vantageWS = (function () {
    function vantageWS(comPort, config) {
        this.station = new vpDevice_1.default(comPort);
        var self = this;
        var updateFreqMS = config.updateFrequency * 1000;
        this.config = config;
        this.station.onOpen = function () {
            var ctimer;
            self.getHiLows();
            ctimer = setInterval(function () {
                if (!self.pauseLoop)
                    self.getCurrent();
            }, updateFreqMS);
        };
        setInterval(function () {
            self.getHiLows();
        }, 60000 * 60);
    }
    vantageWS.prototype.getLoops = function () {
        var self = this;
        self.station.isAvailable().then(function () {
            self.station.wakeUp().then(function (result) {
                self.station.readLoop(10, function (data) {
                    if (vpDevice_1.default.validateCRC(data)) {
                        self.current = new vpCurrent_1.default(data);
                        self.updateWU(self);
                    }
                });
            });
        }, function (err) {
            console.log('hilows device not available');
        });
    };
    vantageWS.prototype.getCurrent = function () {
        var self = this;
        self.station.isAvailable().then(function () {
            self.station.wakeUp().then(function (result) {
                self.station.getData("LOOP 1", 99).then(function (data) {
                    if (vpDevice_1.default.validateCRC(data)) {
                        self.current = new vpCurrent_1.default(data);
                        self.updateWU(self);
                        if (self.onCurrent)
                            self.onCurrent(self.current);
                    }
                }, vantageWS.deviceError);
            }, vantageWS.deviceError);
        });
        //}, function (err) {
        //    console.log('hilows device not available');
        //});
    };
    vantageWS.prototype.getHiLows = function () {
        this.pauseLoop = true;
        var self = this;
        self.station.isAvailable().then(function () {
            self.station.wakeUp().then(function (result) {
                self.station.getData("HILOWS", 438).then(function (data) {
                    //if (vpDevice.validateCRC(data)) {
                    self.hilows = new vpHiLow_1.default(data);
                    self.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');
                    if (self.onHighLow)
                        self.onHighLow(self.hilows);
                    self.pauseLoop = false;
                    //}
                });
            });
        }, function (err) {
            console.log('hilows device not available');
        });
        self.getForeCast();
    };
    vantageWS.deviceError = function (err) {
        console.log(err);
    };
    vantageWS.prototype.updateWU = function (self) {
        var current = self.current;
        var path = self.config.uploadPath + moment().utc().format('YYYY-MM-DD HH:mm:ss').replace(' ', '%20')
            + '&winddir=' + current.windDir + '&windspeedmph=' + current.windAvg
            + '&windgustmph=' + current.windSpeed + '&tempf=' + current.outTemperature
            + '&rainin=' + current.rainRate + '&dailyrainin=' + current.dayRain + '&baromin=' + current.barometer
            + '&humidity=' + current.outHumidity + '&dewptf=' + current.dewpoint
            + '&weather=&clouds='
            + '&softwaretype=custom&action=updateraw';
        var options = {
            host: self.config.uploadHost,
            port: 80,
            path: path,
            method: 'get',
            timeout: 4000
        };
        try {
            var request = http.request(options, function (response) {
                response.on('data', function (chunk) {
                    console.log('update WU: ' + String.fromCharCode.apply(null, chunk) + moment().format('HH:mm:ss') + ' temp:' + current.outTemperature);
                });
                response.on('timeout', function (socket) {
                    console.log('resp timeout');
                });
                response.on('error', function (err) {
                    console.log('resp error' + err);
                });
            });
            request.on('error', function (err) {
                console.log('request error ' + err);
            });
            request.setTimeout(30000, function () {
                console.log('request timeout');
            });
            request.end();
        }
        catch (ex) {
            console.log('updateWU exception');
            console.log(ex);
        }
    };
    vantageWS.prototype.getForeCast = function () {
        var self = this;
        var last;
        if (!self.config.forecastUrl) {
            return;
        }
        if (this.forecast) {
            last = vpBase_1.default.timeDiff(this.forecast.last, 'h');
        }
        if (!last || last >= 4) {
            self.getWebRequest(self.config.forecastUrl, null).then(function (data) {
                var forecast = JSON.parse(data).forecast;
                self.forecast = { last: new Date(), periods: [] };
                forecast.txt_forecast.forecastday.forEach(function (period) {
                    self.forecast.periods.push(period);
                });
            });
        }
    };
    vantageWS.prototype.getWebRequest = function (host, path) {
        if (!path) {
            path = host.substr(host.indexOf('/') - 1 + 1);
            host = host.substr(0, host.indexOf('/'));
        }
        var options = {
            host: host,
            port: 80,
            path: path,
            method: 'get',
            timeout: 4000
        };
        var promise = new Promise(function (resolve, reject) {
            var resultData = '';
            try {
                var request = http.request(options, function (response) {
                    response.on('data', function (chunk, len) {
                        resultData += String.fromCharCode.apply(null, chunk);
                        if (resultData.length == this.headers['content-length'])
                            resolve(resultData);
                    });
                    response.on('timeout', function (socket) {
                        reject();
                    });
                    response.on('error', function (err) {
                        reject(err);
                    });
                });
                request.on('error', function (err) {
                    reject(err);
                });
                request.setTimeout(30000, function () {
                    reject('timeout');
                });
                request.end();
            }
            catch (ex) {
                console.log('getWebRequest exception');
                console.log(ex);
                reject(ex);
            }
        });
        return promise;
    };
    vantageWS.prototype.getArchived = function (startDate) {
        var archives;
        this.pauseLoop = true;
        var self = this;
        self.station.isAvailable().then(function () {
            self.station.wakeUp().then(function (result) {
                if (startDate) {
                    var start = moment(startDate, 'MM/DD/YYYY hh:mm');
                    var stamp = vpBase_1.default.getDateTimeStamp(start);
                }
            });
        });
        return archives;
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