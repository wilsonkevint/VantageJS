"use strict";
var webRequest_1 = require('./webRequest');
var weatherAlert_1 = require('./weatherAlert');
var moment = require('moment');
var http = require('http');
var wunderGround = (function () {
    function wunderGround(config) {
        this.config = config;
    }
    wunderGround.prototype.getAlerts = function () {
        var config = this.config;
        var cityState = config.wuCityState.split(',');
        if (cityState.length != 2)
            return;
        var city = cityState[0];
        var state = cityState[1];
        var token = config.wuToken;
        var url = eval('`' + config.wuAlertUrl + '`');
        return webRequest_1.default.get(url, null).then(function (data) {
            var response = JSON.parse(data);
            var wuAlerts = new Array();
            response.alerts.forEach(function (alert) {
                var wuAlert = new weatherAlert_1.default();
                wuAlert.description = alert.description;
                wuAlert.expires = alert.expires;
                wuAlert.phenomena = alert.phenomena;
                wuAlert.date = alert.date;
                wuAlert.significance = alert.significance;
                wuAlert.message = alert.message;
                wuAlert.type = alert.type;
                wuAlerts.push(wuAlert);
            });
            return wuAlerts;
        });
    };
    wunderGround.prototype.upload = function (current) {
        var config = this.config;
        var wuUserID = config.wuUserID;
        var wuPassword = config.wuPassword;
        var dateutc = +moment().utc().format('YYYY-MM-DD HH:mm:ss').replace(' ', '%20');
        var path = eval('`' + config.uploadPath + '`')
            + '&winddir=' + current.windDir + '&windspeedmph=' + current.windAvg
            + '&windgustmph=' + current.windSpeed + '&tempf=' + current.outTemperature
            + '&rainin=' + current.rainRate + '&dailyrainin=' + current.dayRain + '&baromin=' + current.barometer
            + '&humidity=' + current.outHumidity + '&dewptf=' + current.dewpoint
            + '&action=updateraw&realtime=1&rtfreq=' + config.updateFrequency;
        var options = {
            host: config.uploadHost,
            port: 80,
            path: path,
            method: 'get',
            timeout: 4000
        };
        try {
            var request = http.request(options, function (response) {
                response.on('data', function (chunk) {
                    //console.log('update WU: ' + String.fromCharCode.apply(null, chunk) + moment().format('HH:mm:ss') + ' temp:' + current.outTemperature);
                    current.wuUpdated = new Date();
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
    wunderGround.prototype.getForeCast = function () {
        var config = this.config;
        if (!config.forecastUrl) {
            return;
        }
        var token = config.wuToken;
        var cityState = config.wuCityState.split(',');
        var city = cityState[0];
        var state = cityState[1];
        var url = eval('`' + config.forecastUrl + '`');
        return webRequest_1.default.get(url, null).then(function (data) {
            var wforecast = JSON.parse(data).forecast;
            var forecast = { last: new Date(), periods: [] };
            wforecast.txt_forecast.forecastday.forEach(function (period) {
                forecast.periods.push(period);
            });
            return forecast;
        });
    };
    return wunderGround;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = wunderGround;
//# sourceMappingURL=wunderGround.js.map