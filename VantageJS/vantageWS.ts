declare function require(name: string);

import vpDevice from './vpDevice';
import vpCurrent from './vpCurrent';
import vpHiLow from './vpHiLow';
import vpBase from './vpBase';
import vpArchive from './vpArchive';

var moment = require('moment');
var http = require('http');
var Promise = require('promise');
var os = require('os');
var linq = require('linq');

const pauseSecs: number = 30;

export default class vantageWS {
    station: vpDevice;
    current: vpCurrent;
    hilows: vpHiLow;
    pauseLoop: number;
    onCurrent: any;
    onHighLow: any;    
    config: any;
    forecast: any;
        
    public constructor(comPort: string, config: any) {
        this.station = new vpDevice(comPort);
        var self = this;
        var updateFreqMS = config.updateFrequency * 1000;
      
        this.config = config;

        this.station.onOpen = function () {
            var ctimer;           
                        
            self.getHiLows(); 

            ctimer = setInterval(function () {

                if (!self.pauseLoop)
                    self.getCurrent();
                else
                    self.pauseLoop--;
                                

            }, updateFreqMS);
        
        }

        setInterval(function () {
            self.getHiLows();
        }, 60000 * 60); 
     
    }
      

    getCurrent()  {
        var self = this;              

        self.station.isAvailable().then(function () {

            self.station.wakeUp().then(function (result) {

                self.station.getData("LOOP 1", 99, true).then(function (data) {

                    if (vpDevice.validateCRC(data)) {
                        self.current = new vpCurrent(data);
                        self.updateWU(self);

                        if (self.onCurrent)
                            self.onCurrent(self.current);

                        //self.pauseLoop = true;

                        //self.station.getArchived("09/17/2016 00:00", function (archives) {
                        //    var hiTemp;
                        //    var lowTemp;
                            
                        //    hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', self.queryArchives)
                        //        .log("$.date + ' ' + $.min + ' ' + $.max").toJoinedString();
                            
                       // }); 

                    }

                }, vantageWS.deviceError);

            }, vantageWS.deviceError)
        
        }, function (err) {
            console.log('hilows device not available');
        });

    }

    queryArchives(key, group) {
        return {
            date: key, min: group.min(), max: group.max()
        }
    }


    getHiLows() {
        var self = this;    
        self.pauseLoop = 20 / self.config.updateFrequency;
         

        self.station.isAvailable().then(function () {

            self.station.wakeUp().then(function (result) {
                self.station.getData("HILOWS", 438,true).then(function (data) {

                    if (vpDevice.validateCRC(data)) {
                        self.hilows = new vpHiLow(data);
                        self.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');

                        if (self.onHighLow)
                            self.onHighLow(self.hilows);

                        self.pauseLoop = 0;
                      
                    }

                });
            });          

        }, function (err) {
            console.log('hilows device not available');
            self.pauseLoop = 0;
        });

        self.getForeCast(); 

    }


    static deviceError(err) {
        console.log(err);
    }

    updateWU(self: vantageWS) {
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

    getForeCast(): any {
        var self = this;
        var last; 

        if (!self.config.forecastUrl) {
            return;
        }

        if (this.forecast) {
            last = vpBase.timeDiff(this.forecast.last, 'h');            
        }

        if (!last || last >= 4) {

            self.getWebRequest(self.config.forecastUrl,null).then(function (data) {
                var forecast = JSON.parse(data).forecast;
                self.forecast = {last: new Date(), periods:[]}; 

                forecast.txt_forecast.forecastday.forEach(function (period) {
                    self.forecast.periods.push(period);
                });
            });
        }
    }



    getWebRequest(host: string, path: string): any {

        if (!path) {
            path = host.substr(host.indexOf('/') -1 + 1);
            host = host.substr(0, host.indexOf('/')); 
        }
        var options = {
            host: host,
            port: 80,
            path: path,
            method: 'get',
            timeout: 4000
        }

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
    }

    
   

   


     

}


        //rl.on('line', (input) => {
        //console.log(`Received: ${input}` + input.length);
        //  if (input.length == 0)
        //	myPort.write('\n'); 
        //  else
        //	myPort.write(input); 
        //});

