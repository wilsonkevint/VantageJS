"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require('moment');
const http = require('http');
const WebRequest_1 = require("./WebRequest");
const WeatherAlert_1 = require("./WeatherAlert");
const Common = require("./Common");
class Wunderground {
    constructor(config, mongo) {
        this.config = config;
        this.mongo = mongo;
    }
    getAlerts() {
        var config = this.config;
        var cityState = config.wuCityState.split(',');
        if (cityState.length != 2)
            return;
        var city = cityState[0];
        var state = cityState[1];
        var token = config.wuToken;
        var url = eval('`' + config.wuAlertUrl + '`');
        return WebRequest_1.default.get(url, null).then(data => {
            var response = JSON.parse(data);
            var wuAlerts = new Array();
            response.alerts.forEach(alert => {
                var wuAlert = new WeatherAlert_1.default();
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
    }
    upload(current) {
        var config = this.config;
        var wuUserID = config.wuUserID;
        var wuPassword = config.wuPassword;
        if (current.wuUpdated == null)
            current.wuUpdated = moment();
        var dateutc = current.wuUpdated.utc().format('YYYY-MM-DD HH:mm:ss').replace(' ', '%20');
        ;
        var path = eval('`' + config.uploadPath + '`')
            + '&winddir=' + current.windDir + '&windspeedmph=' + current.windAvg
            + '&windgustmph=' + current.windSpeed + '&tempf=' + current.temperature
            + '&rainin=' + current.rainRate + '&dailyrainin=' + current.dayRain + '&baromin=' + current.barometer
            + '&humidity=' + current.humidity + '&dewptf=' + current.dewpoint
            + '&action=updateraw'
            + '&realtime=1&rtfreq=' + config.updateFrequency;
        var options = {
            host: config.uploadHost,
            port: 80,
            path: path,
            method: 'get',
            timeout: 4000
        };
        try {
            var request = http.request(options, response => {
                response.on('data', chunk => {
                    var resultData = String.fromCharCode.apply(null, chunk);
                    var timeStamp = current.wuUpdated.unix();
                    this.mongo.update('wuUpdated', { _id: 1, lastUpdate: timeStamp }, true).then(() => {
                    }, err => {
                        Common.Logger.error(err);
                    });
                });
                response.on('timeout', socket => {
                    Common.Logger.error('upload resp timeout');
                });
                response.on('error', err => {
                    Common.Logger.error('upload resp error' + err);
                });
            });
            request.on('error', err => {
                Common.Logger.error('upload error ' + err);
            });
            request.setTimeout(30000, () => {
                Common.Logger.error('upload timeout');
            });
            request.end();
        }
        catch (ex) {
            Common.Logger.error('upload exception');
            Common.Logger.error(ex.toString());
        }
    }
    getForecast() {
        var config = this.config;
        if (!config.forecastUrl) {
            return;
        }
        var token = config.wuToken;
        var cityState = config.wuCityState.split(',');
        var city = cityState[0];
        var state = cityState[1];
        var url = eval('`' + config.forecastUrl + '`');
        return WebRequest_1.default.get(url, null).then(function (data) {
            var wforecast = JSON.parse(data).forecast;
            var forecast = { last: new Date(), periods: [] };
            wforecast.txt_forecast.forecastday.forEach(period => {
                forecast.periods.push(period);
            });
            return forecast;
        });
    }
}
exports.default = Wunderground;
//# sourceMappingURL=Wunderground.js.map