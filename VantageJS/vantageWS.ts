declare function require(name: string); 
const moment = require('moment');
const http = require('http');
const os = require('os');
const emailjs = require('emailjs');
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
    vp1Current: VPCurrent;
    vp1Hilows: VPHiLow;
    config: any;
    forecast: any;
    wu: Wunderground;
    alerts: Array<WeatherAlert>;   
    loopInterval: any;      
    hilowInterval: any;
    eventEmitter: any;
    pauseTimer: number;
    isActive: boolean;
    queryEngine: QueryEngine;
    
    public constructor(config: any, ) {  
      
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
                    else
                        resolve();

                }, err => reject(err));
            },5000);
        });
        return promise;
    }

    start() {
        this.sendEmail('VantageJS app started');

        this.getAlerts();        

        this.getTime(dt => {
            if (dt) {
                if (Math.abs(VPBase.timeDiff(dt, 's')) > 10) {
                    this.setTime();
                }
            }
            else
                Common.Logger.error('getTime failed');
        });

        setTimeout(()=> this.hiLowArchive(), 3000);

        this.hilowInterval = setInterval(()=> this.hiLowArchive(), this.config.hilowInterval);

        this.loopInterval = setInterval(()=> this.startLoop(), this.config.loopInterval)
        
    }

    startLoop() {      
        if (!this.pauseTimer) {

            if (this.current == null || VPBase.timeDiff(this.current.dateLoaded, 's') > 5) {

                this.device.isAvailable().then(() => {
                    this.device.wakeUp().then(result => {
                        this.device.writeLoop(99, () => {
                            this.processLoop();
                        });
                    }, VantageWs.deviceError);

                }, VantageWs.deviceError);
            }
        }

    }

    stop() {
        clearInterval(this.loopInterval);
        this.device.wakeUp();               //clear loop
    }

    processLoop() {
        var data = this.device.serialData;
       
        var startx = data.length == 99 ? 0 : 1; 
        if (VPDevice.validateCRC(data, startx)) {
            this.current = new VPCurrent(data);       

            if (this.vp1Current && VPBase.timeDiff(this.vp1Current.dateLoaded, 'm') < 6) {
                console.log('replacing current temp of ' + this.current.temperature + ' with vp1 temp of ' + this.vp1Current.temperature);
                this.current.temperature = this.vp1Current.temperature;
            }

            this.wu.upload(this.current);

            this.emit('current', this.current);

            if (this.config.debug) {
                console.log('temp:' + this.current.temperature + ' ' + this.current.dateLoaded);
            }
        }     
    }

    hiLowArchive() {       
        this.pauseLoop(180);

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

                this.device.getArchived(lastDt).then((archives: Array<VPArchive>) => {
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
        var tries = 3;
        var promise = new Promise((resolve, reject) => {
            var getArchive = () => {
                this.device.getArchived(startDate).then((archives: Array<VPArchive>) => {
                    resolve(archives);
                }, err => {
                    if (tries > 0) {
                        console.log('getArchives retry due to ', err);
                        getArchive();
                        tries--;
                    }
                    else {
                        Common.Logger.error('getArchives', err);
                        reject(err);
                    }
                });
            }

            getArchive();
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

        if (!last || last >= 4 || (this.forecast.periods.length && !this.forecast.periods[0].fcttext)) {
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
     
    sendCommand(cmd, callback, binres?:boolean) {

        this.pauseLoop(2, null);

        this.device.isAvailable().then(() => {

            this.device.wakeUp().then(result => {
                this.device.getSerial(cmd + '\n', 1, false).then(data => {
                    var result = '';
                    if (!binres) {
                        for (var i in data) {
                            result += String.fromCharCode(data[i]);
                        }
                    }
                    else {
                        result = data;
                    }
                    callback(result);

                }, this.errorHandler);

            }, this.errorHandler);
        });
        

        
    }

    getTime(cb) {
        this.sendCommand("GETTIME", res => {
            if (res[0] == 6) {
                res.splice(0, 1);
            }
            var secs = res[0];
            var mins = res[1];
            var hrs = res[2];
            var day = res[3];
            var mon = res[4];
            var yr = res[5] + 1900;
            var crc = res.splice(6, 2);
            if (crc.join('') == VPDevice.getCRC(res).join('')) {
                var dt = new Date(yr, mon - 1, day, hrs, mins, secs);
                cb(dt);
            }
            else
                cb(null);
           
        },true);
    }

    setTime() {
       
        var data = [6];
        var now = new Date();
        data[0] = now.getSeconds();
        data[1] = now.getMinutes();
        data[2] = now.getHours();
        data[3] = now.getDate();
        data[4] = now.getMonth() + 1;
        data[5] = now.getFullYear() - 1900;
        var crc = VPDevice.getCRC(data);
        Array.prototype.push.apply(data,crc);

        this.sendCommand("SETTIME", (result) => {
            if (result[0] == 6) {
                this.device.getSerial(data,1,true).then(res => {
                    if (res[0] == 6) {
                        Common.Logger.info('time successfully changed');
                    }                       
                },true);
            }
            else {
                Common.Logger.info('time successfully not changed');                   
            }
        },true);
    }

    pauseLoop(secs, cb?) {
        this.pauseTimer = setTimeout(() => {
            this.pauseTimer = 0;
            if (cb)
                cb();

        }, secs * 1000);
    }

    clearPause() {
        if (this.pauseTimer) {
            clearTimeout(this.pauseTimer);
            this.pauseTimer = 0;
        }
    }

    sendEmail(msg) {
        try {
            if (this.config.smtpServer) {
                var mailsrv = emailjs.server.connect({
                    host: this.config.smtpServer,
                    ssl: false
                });

                var message = {
                    text: msg,
                    from: this.config.emailFrom,
                    to: this.config.emailTo,
                    subject: 'VantageJS'
                }


                mailsrv.send(message, (err, msg) => {
                    //console.log(err || msg);
                });
            }
        }
        catch (e) {
            console.log('sendEmail ' + e);
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
     
    subscribeEvent(listener: any,eventName:string) {
        try {
            this.eventEmitter.on(eventName, listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

    subscribeCurrent(listener: any) {
        try {
            this.eventEmitter.on('current', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

    subscribeHiLow(listener: any) {
        try {
            this.eventEmitter.on('hilows', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
    subscribeAlert(listener: any) {
        try {
            this.eventEmitter.on('alert', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
    subscribeHistory(listener: any) {
        try {
            this.eventEmitter.on('history', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

}
