declare function require(name: string);
const moment = require('moment');
const http = require('http');
const process = require('process');
import WebRequest from './WebRequest';
import WeatherAlert from './WeatherAlert';
import VPCurrent from './VPCurrent';
import MongoDB from './MongoDB';
import * as Common from './Common';

export default class Wunderground {
    config: any;
    mongo: MongoDB;

    constructor(config, mongo: MongoDB) {
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
        if (current.wuUpdated == null)
            current.wuUpdated = moment(); 

        var dateutc = current.wuUpdated.utc().format('YYYY-MM-DD+HH:mm:ss');
        dateutc = dateutc.replace(':', '%3a');

        var path = eval('`' + config.uploadPath + '`')
            + '&winddir=' + current.windDir + '&windspeedmph=' + current.windAvg
            + '&windgustmph=' + current.windSpeed + '&tempf=' + current.temperature
            + '&rainin=' + current.rainRate + '&dailyrainin=' + current.dayRain + '&baromin=' + current.barometer
            + '&humidity=' + current.humidity + '&dewptf=' + current.dewpoint
            + '&action=updateraw'
            + '&softwaretype=custom'
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

                    if (resultData.startsWith('success')) {
                        this.mongo.find('wuUpdated', { _id: 1 }).next().then(wuUpd => {
                            if (wuUpd.lastUpdate < timeStamp) {
                                this.mongo.update('wuUpdated', { _id: 1, lastUpdate: timeStamp }, true).then(() => {
                                }, err => {
                                    Common.Logger.error(err);
                                    process.exit(-1);
                                });
                            }
                        });
                    }
                    else 
                        Common.Logger.info('wu.upload result:' + resultData);
                });
                response.on('timeout', socket => {
                    Common.Logger.error('wu.upload resp timeout');
                });
                response.on('error', err => {
                    Common.Logger.error('wu.upload resp error ' + err);
                });
            });
            request.on('error', err => {
                Common.Logger.error('wu.upload error ' + err);
            });
            request.setTimeout(30000, () => {
                Common.Logger.error('wu.upload timeout');
            });
            request.end();
           
        }
        catch (ex) {
            Common.Logger.error('wu.upload exception');
            Common.Logger.error(ex.toString());
        }
    }

    getForecast(): any {        
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