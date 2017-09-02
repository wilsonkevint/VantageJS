declare function require(name: string); 
const moment = require('moment');
const http = require('http');
const os = require('os');
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
import QueryEngine from './QueryEngine';
import CWOP from './CWOP';

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
    queryEngine: QueryEngine;

    public constructor(config: any) {  
      
        this.config = config;       
        this.eventEmitter = new EventEmitter();         

        this.mongo = new MongoDB(config);
        this.wu = new Wunderground(config, this.mongo);    
    }

    init() {
        var promise = new Promise((resolve, reject) => {
            setTimeout(() => {
                this.mongo.connect().then(() => {
                    this.queryEngine = new QueryEngine(this.config, this.mongo);
                    if (this.config.runVWS == "1") {
                        var comPort = this.config[os.platform() + '_serialPort'];
                        this.device = new VPDevice(comPort);
                        this.device.onOpen = () => {
                            this.isActive = true;
                            resolve();
                        }
                    }

                }, err => reject(err));
            },5000);
        });
        return promise;
    }

    start() {    
        this.getAlerts();        

        this.hiLowArchive();

        this.loopTimer = setInterval(() => {
            var lastHiLow = null;

            if (this.hilows) {
                lastHiLow = VPBase.timeDiff(this.hilows.dateLoaded, 's');
            }

            if (!this.pauseTimer) {
                if (lastHiLow >= 300) {
                    this.hiLowArchive();
                }
                else {
                    if (this.current == null || VPBase.timeDiff(this.current.dateLoaded, 's') > 4) {
                        this.startLoop();
                    }
                }
            }            

        },  this.config.loopTimer * 1000);
    }

    startLoop() {      
        this.device.isAvailable().then( ()=> {

            this.device.wakeUp().then(result => {
                this.device.readLoop(99, () => {
                    this.processLoop();
                });
            }, VantageWs.deviceError);

        }, VantageWs.deviceError);      

    }

    stop() {
        clearInterval(this.loopTimer);
        this.device.wakeUp();               //clear loop
    }

    processLoop() {
        var data = this.device.serialData;
       
        var startx = data.length == 99 ? 0 : 1; 
        if (VPDevice.validateCRC(data, startx)) {
            this.current = new VPCurrent(data);
            this.wu.upload(this.current);

            this.emit('current', this.current);

            if (this.config.debug) {
                console.log('temp:' + this.current.temperature + ' ' + this.current.dateLoaded);
            }
        }     
    }

    hiLowArchive() {  
        this.pauseLoop(180, null);

        this.getHiLows(() => {
            this.updateArchives().then(() => {
                this.clearPause();         

                if (this.current != null) {

                    this.queryEngine.getRainTotals(moment()).then((rain: any) => {
                        this.hilows.rain24hour = rain.last24;
                        this.hilows.rain1hour = rain.hourly;

                        this.updateCWOP(this.current, this.hilows);


                    }, VantageWs.deviceError);
                }

                this.updateFromArchive().then(() => {
                }, this.errorHandler);
               
            }, err => {
                VantageWs.deviceError(err);
                this.clearPause();
            });

        });        
    }

    updateCWOP(current, hilows) {
        var cwop = new CWOP(this.config);
        cwop.update(current, hilows).then(() => {
            console.log('cwop updated');
        },
            err => VantageWs.deviceError('cwop error ' + err)
        );
    }   

    updateArchives() {      
        var promise = new Promise((resolve, reject) => {
            this.mongo.getLast('archive').then((last: VPArchive) => { 
                var lastDt = last ? last.archiveDate + ' ' + last.archiveTime : null;
                var lastId = last ? last._id : 0;

                this.getArchives(lastDt).then((archives: Array<VPArchive>) => {
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
                    this.errorHandler(err);
                    reject(err);
                });
            }, err => {
                this.errorHandler(err);
                reject(err);
            });
        });

        return promise;
    }   

    updateFromArchive() {
        var lastDt = null;
        var dayRain;
        var promise = new Promise((resolve, reject) => {

            this.mongo.find('wuUpdated', { _id: 1 }).next().then(wuUpd => {
                if (wuUpd != null) {
                    var csr = this.mongo.sort('archive', { _id: { $gt: wuUpd.lastUpdate } }, { _id: 1 });
                    csr.toArray().then((archives: Array<VPArchive>) => {

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
                                this.wu.upload(curr);

                                var hilows = new VPHiLow(null);
                                this.queryEngine.getRainTotals(curr.wuUpdated).then((rain: any) => {
                                    hilows.rain24hour = rain.last24;
                                    hilows.rain1hour = rain.hourly;
                                    this.updateCWOP(curr, hilows);
                                }, VantageWs.deviceError);
                                Common.Logger.info('updateFromArchive:', curr.wuUpdated.toString());
                            }                           
                        });  

                        resolve();
                    });

                          
                }               

            }, err => {
                Common.Logger.error(err);
                reject();
            }
            );
        });

        return promise;
       
    }

    errorHandler(err) {       
        Common.Logger.error(+ err);
    }    

    getArchives(startDate) {       
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

                    if (VPDevice.validateCRC(data,0)) {
                        this.hilows = new VPHiLow(data);
                        this.hilows.dateLoaded = new Date();  

                        this.getForecast().then(forecast => {
                            this.forecast = forecast;
                            this.hilows.forecast = this.forecast;
                            this.emit('hilows', this.hilows);
                        }, this.errorHandler);                       
                       

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
                if (alerts.length) {
                    this.emit('alerts', alerts);
                }
            }, this.errorHandler);
        }

        doalerts();

        setInterval(() => {
            doalerts();
        }, 60000 * 15);
    }    
     
    sendCommand(cmd, callback) {

        this.pauseLoop(2, () => {
            this.device.isAvailable().then(() => {

                this.device.wakeUp().then(result => {

                    this.device.getSerial(cmd + '\n', 1, false).then(data => {
                        var result = '';
                        for (var i in data) {
                            result += String.fromCharCode(data[i]);
                        }
                        callback(result);

                    }, this.errorHandler);

                },this.errorHandler);
            })
        });

        
    }

    getTime(cb) {
        this.sendCommand("GETTIME", cb);
    }

    setTime() {
        var data = [6];
        var now = new Date();
        data[0] = now.getSeconds();
        data[1] = now.getMinutes();
        data[2] = now.getHours();
        data[3] = now.getDate() + 1;
        data[4] = now.getMonth() + 1;
        data[5] = now.getFullYear() - 1900;
        var crc = VPDevice.getCRC(data);
        data.push(crc);
       
        this.sendCommand("SETTIME", (result) => {
            if (result == 6) {
                this.sendCommand(data, (res) => {
                    if (res == 6)
                        Common.Logger.info('time successfully changed');
                });
            }
        });

    }

    pauseLoop(secs, cb) {
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
        try {
            this.eventEmitter.emit(name, obj);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

    onCurrent(listener: any) {
        try {
            this.eventEmitter.on('current', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
    onHighLow(listener: any) {
        try {
            this.eventEmitter.on('hilows', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
    onAlert(listener: any) {
        try {
            this.eventEmitter.on('alert', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
    onHistory(listener: any) {
        try {
            this.eventEmitter.on('history', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

}
