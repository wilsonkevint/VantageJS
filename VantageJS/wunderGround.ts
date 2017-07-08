declare function require(name: string);

import WebRequest from './WebRequest';
import WeatherAlert from './WeatherAlert';
import VPCurrent from './VPCurrent';
var moment = require('moment');
var http = require('http');

export default class Wunderground {
    config: any;

    constructor(config) {
        this.config = config;
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

        return WebRequest.get(url, null).then(data => {
            var response = JSON.parse(data);

            var wuAlerts = new Array<WeatherAlert>();

            response.alerts.forEach(alert => {
                var wuAlert = new WeatherAlert();
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

    upload(current: VPCurrent) {

        var config = this.config;
        var wuUserID = config.wuUserID;
        var wuPassword = config.wuPassword;
        var dateutc = +moment().utc().format('YYYY-MM-DD HH:mm:ss').replace(' ', '%20');

        var path = eval('`' + config.uploadPath + '`')
        +'&winddir=' + current.windDir + '&windspeedmph=' + current.windAvg
            + '&windgustmph=' + current.windSpeed + '&tempf=' + current.temperature
            + '&rainin=' + current.rainRate + '&dailyrainin=' + current.dayRain + '&baromin=' + current.barometer
            + '&humidity=' + current.humidity + '&dewptf=' + current.dewpoint
            + '&action=updateraw&realtime=1&rtfreq=' + config.updateFrequency;

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
                    console.log('update WU: ' + String.fromCharCode.apply(null, chunk) + moment().format('HH:mm:ss') + ' temp:' + current.temperature);
                    current.wuUpdated = new Date();
                });
                response.on('timeout', socket => {
                    console.log('resp timeout');
                });
                response.on('error', err => {
                    console.log('resp error' + err);
                });
            });
            request.on('error', err => {
                console.log('request error ' + err);
            });
            request.setTimeout(30000, () => {
                console.log('request timeout');
            });
            request.end();
        }
        catch (ex) {
            console.log('updateWU exception');
            console.log(ex);
        }
    }

    getForeCast(): any {        
        var config = this.config; 

        if (!config.forecastUrl) {
            return;
        }

        var token = config.wuToken; 
        var cityState = config.wuCityState.split(','); 
        var city = cityState[0];
        var state = cityState[1]; 
        var url = eval('`' + config.forecastUrl + '`');      

        return WebRequest.get(url, null).then(function(data) {
            var wforecast = JSON.parse(data).forecast;
            var forecast = { last: new Date(), periods: [] };

            wforecast.txt_forecast.forecastday.forEach( period => {
                forecast.periods.push(period);
            });
        
            return forecast;
            

        });
        
    }

}