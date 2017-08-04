declare function require(name: string); 
var moment = require('moment');
var http = require('http');
var os = require('os');
var linq = require('linq');

import VPDevice from './VPDevice';
import VPCurrent from './VPCurrent';
import VPHiLow from './VPHiLow';
import VPBase from './VPBase';
import VPArchive from './vpArchive';
import WebRequest from './WebRequest';
import Wunderground from './Wunderground';
import WeatherAlert from './WeatherAlert';
import * as Common from './Common';
import MongoDB from './MongoDB';
import { EventEmitter } from 'events';

export default class VantageWs  {    
    mongo: any;
    device: VPDevice;
    current: VPCurrent;
    hilows: VPHiLow;  
    config: any;
    forecast: any;
    wu: Wunderground;
    alerts: Array<WeatherAlert>;   
    loopTimer: any;      
    eventEmitter: any;
    pauseTimer: number;
    isActive: boolean;
    
    public constructor(comPort: string, config: any) {        
        
        this.device = new VPDevice(comPort);     
        var updateFreqMs = config.updateFrequency * 1000;
      
        this.config = config;
        this.wu = new Wunderground(config);
        this.eventEmitter = new EventEmitter();
        this.getAlerts();
        
        this.device.onOpen = () => {
            this.isActive = true;
            this.start();   
        }

        this.mongo = new MongoDB(config);
        this.mongo.connect().then(() => {            
            Common.Logger.info('database connected');
        })        
     
    }

    start() {    

        this.loopTimer = setInterval(() => {
            var lastHiLow = null;

            if (this.hilows) {
                lastHiLow = VPBase.timeDiff(this.hilows.dateLoaded, 's');
            }

            if (!this.pauseTimer) {
                if (lastHiLow == null || lastHiLow >= 300) {      
                    this.pause(180, null);
                    this.hiLowArchive();
                }
                else {                    
                    this.startLoop();
                }
            }

            if (this.current && this.config.debug) {
                console.log('temp:' + this.current.temperature + ' ' + this.current.dateLoaded);
            }

        }, this.config.updateFrequency * 1000);
    }

    startLoop() {      
        this.device.isAvailable().then( ()=> {

            this.device.wakeUp().then(result => {

                this.device.readLoop(1, data => {                  
                  
                    if (VPDevice.validateCRC(data)) {
                        this.current = new VPCurrent(data);                        
                        this.wu.upload(this.current);

                        this.emit('current',this.current);
                    }                    
                })
            }, VantageWs.deviceError);

        }, VantageWs.deviceError);      

    }

    hiLowArchive() {  
        this.getHiLows(() => {
            this.updateArchives().then(() => {
                this.clearPause();
            }, err => {
                this.clearPause();
            });
        });
        
    }

    archiveGroupBy(archives) {
        var hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', this.queryArchives)
        hiTemp.forEach(t => {
            console.log(t);
        });
    }

    queryArchives(key, group) {
        return {
            date: key, min: group.min(), max: group.max(), count: group.count()
        }
    }

    updateArchives() {      
        var promise = new Promise((resolve, reject) => {
            this.mongo.getLast('archive').then((last: VPArchive) => { 
                var lastDt = last ? last.archiveDate + ' ' + last.archiveTime : null;
                var lastId = last ? last._id : 0;

                this.retrieveArchives(lastDt).then((archives: Array<VPArchive>) => {
                    try {
                         
                        archives.forEach((a: VPArchive) => {
                            a._id = moment(a.archiveDate + ' ' + a.archiveTime, 'MM/DD/YYYY HH:mm').unix();
                            if (a._id > lastId) {
                                this.mongo.insert('archive',a).then(res => {
                                    console.log('inserted ' + a.archiveDate + ' ' + a.archiveTime);
                                }, err => {
                                    this.errorHandler(err);
                                    reject(err);
                                });
                            }
                        });

                        resolve();
                    }
                    catch (e) {
                        this.errorHandler(e);
                        reject(e);
                    }
                }, err => {
                    reject(err);
                });
            }, err => {
                reject(err);
            });
        });

        return promise;
    }

    errorHandler(err) {
        Common.Logger.error(err);
    }

    getArchivesDB(startDate) {
        var dt = moment(startDate, 'MM/DD/YYYY HH:mm').unix(); 

        var promise = new Promise((resolve, reject) => {
            this.mongo.find('archive',{ $gte: dt }).toArray().then(res => {
                resolve(res);
            });
        });

        return promise;
    }

    retrieveArchives(startDate) {       
        var promise = new Promise((resolve, reject) => {
            this.device.getArchived(startDate).then((archives: Array<VPArchive>) => {             
                resolve(archives);
            }, err => {
                Common.Logger.error('getArchives', err);
                reject(err);
            });
        });

        return promise;
    }

    getHiLows(callback) {

        this.device.isAvailable().then(()=> {

            this.device.wakeUp().then(result => {                

                this.device.getSerial("HILOWS", 438, true).then(data => {                   

                    if (VPDevice.validateCRC(data)) {
                        this.hilows = new VPHiLow(data);
                        this.hilows.dateLoaded = new Date();  

                        this.getForecast().then(forecast => {
                            this.forecast = forecast;
                            this.hilows.forecast = this.forecast;
                            this.emit('hilows', this.hilows);
                        });                       
                       

                        Common.Logger.info('hi temp:' + this.hilows.temperature.dailyHi);
                        callback(this.hilows);

                    }

                }, (err) => { Common.Logger.error(err); callback('error')});
            });          

        }, err => {
            Common.Logger.error('hilows device not available'); callback('error');           
        });
    }

    static deviceError(err) {
        Common.Logger.error(err);
    }      

    getForecast(): any {      
        var last;   
        var promise;

        if (this.forecast) {
            last = VPBase.timeDiff(this.forecast.last, 'h');
        }

        if (!last || last >= 4) {
            promise = this.wu.getForecast();  
        }
        else {
            promise = Promise.resolve(this.forecast);
        }

        return promise;
    }

    getAlerts() {
      
        var doalerts = ()=> {
            this.wu.getAlerts().then(alerts => {
                this.alerts = alerts;
                if (alerts.length && this.onAlert) {
                    this.onAlert(alerts);
                }
            });
        }

        doalerts();

        setInterval(() => {
            doalerts();
        }, 60000 * 15);
    }

    getHourlyRain() {
        var csr = this.mongo.getLastRecs('archives',15);
        this.current.hourlyRain = 0; 

        csr.forEach(rec=> {
            this.current.hourlyRain += rec.rainClicks;
        });
    }
     
    sendCommand(cmd, callback) {

        this.pause(2, () => {
            this.device.isAvailable().then(() => {

                this.device.wakeUp().then(result => {

                    this.device.getSerial(cmd + '\n', 1, false).then(data => {
                        var result = '';
                        for (var i in data) {
                            result += String.fromCharCode(data[i]);
                        }
                        callback(result);
                    }, err => {
                    });
                });
            })
        });

        
    }

    pause(secs, cb) {
        this.pauseTimer = secs;
        setTimeout(() => {
            this.pauseTimer = 0; if (cb) cb();
        }, secs * 1000);
    }

    clearPause() {
        if (this.pauseTimer) {
            clearTimeout(this.pauseTimer);
            this.pauseTimer = 0;
        }
    }

    emit(name: string, obj: any) {
        this.eventEmitter.emit(name, obj);
    }

    onCurrent(listener: any) {
        this.eventEmitter.on('current', listener);
    }
    onHighLow(listener: any) {
        this.eventEmitter.on('hilows', listener);
    }
    onAlert(listener: any) {
        this.eventEmitter.on('alert', listener);
    }
    onHistory(listener: any) {
        this.eventEmitter.on('history', listener);
    }

}
