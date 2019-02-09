declare function require(name: string);
import Database from './Database';
const moment = require('moment');
const http = require('http');
const process = require('process');
import WebRequest from './WebRequest';
import WeatherAlert from './WeatherAlert';
import VPCurrent from './VPCurrent';
import VPArchive from './VPArchive';
import VPHiLow from './VPHiLow';

import * as Common from './Common';

export default class Wunderground {
    config: any;
    database: Database;
     
    constructor() {
        this.config = require('./VantageJS.json');
        this.database = new Database();
    }    

    async getAlerts() {
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
        dateutc = dateutc.replace(/:/g, '%3a');

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
                        this.database.find('wuUpdated', { _id: 1 }).next().then(wuUpd => {
                            if (wuUpd.lastUpdate < timeStamp) {
                                this.database.update('wuUpdated', { _id: 1, lastUpdate: timeStamp }, true).then(() => {
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


    async updateFromArchive() {
        var lastDt = null;
        var dayRain;
        var promise = new Promise(async(resolve, reject) => {
            let database = new Database();
            await database.connect();
            let wuUpd = await database.find('wuUpdated', { _id: 1 }).next();
            if (wuUpd != null) {
                var csr = database.sort('archive', { _id: { $gt: wuUpd.lastUpdate } }, { _id: 1 });

                let archives = await csr.toArray();

                archives.forEach((arch: VPArchive) => {
                    if (!lastDt || lastDt != arch.archiveDate) {
                        dayRain = 0;
                        lastDt = arch.archiveDate;
                    }
                    if (arch.rainClicks > 0)
                        dayRain += arch.rainClicks / 100;

                    if (arch._id > wuUpd.lastUpdate) {
                        var curr = new VPCurrent(null);
                        curr.barometer = arch.barometer;
                        curr.dayRain = dayRain;
                        curr.humidity = arch.humidity;
                        curr.rainRate = (arch.rainClicks / 100) * 4;          //rainClicks / 100 * archival frequency of every 15 mins
                        curr.temperature = arch.outTemp;
                        curr.windAvg = arch.windAvg;
                        curr.windDir = arch.prevWindDir;
                        curr.windSpeed = arch.windHi;
                        curr.dewpoint = VPCurrent.fDewpoint(curr.temperature, curr.humidity);
                        curr.wuUpdated = moment(arch.archiveDate + ' ' + arch.archiveTime, "MM/DD/yyyy HH:mm");
                        this.upload(curr);                           
                        Common.Logger.info('updateFromArchive:', curr.wuUpdated.toString());
                    }
                });

                resolve();
            }

        });

        return promise;

    }

}