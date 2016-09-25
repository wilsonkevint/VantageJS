declare function require(name: string);
import webRequest from './webRequest';
import weatherAlert from './weatherAlert';
var moment = require('moment');
var http = require('http');

export default class weatherUG {   

    getAlerts(config): PromiseLike<Array<weatherAlert>> {       

        var cityState = config.alertCityState.split(',');
        if (cityState.length != 2)
            return;

        var city = cityState[0];
        var state = cityState[1];
        var token = config.wuToken;       

        var url = eval('`' + config.wuAlertUrl + '`'); 
    
        return webRequest.get(url, null).then(function (data) {
            var response = JSON.parse(data);

            var wuAlerts = new Array<weatherAlert>();

            response.alerts.forEach(alert => {
                var wuAlert = new weatherAlert();
                wuAlert.description = alert.description;
                wuAlert.expires = alert.expires;
                wuAlert.phenomena = alert.phenomena;
                wuAlert.pubDate = alert.date;
                wuAlert.significance = alert.significance;
                wuAlert.message = alert.message;
                wuAlert.type = alert.type;
                wuAlerts.push(wuAlert); 
            });         

           
            return wuAlerts;
        });  
       
    }

    updateWU(config,current) {

        var wuUserID = config.wuUserID;
        var wuPassword = config.wuPassword;
        var dateutc = + moment().utc().format('YYYY-MM-DD HH:mm:ss').replace(' ', '%20');

        var path = eval('`' + config.uploadHost + '`');
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
        }

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

    }

    

} 