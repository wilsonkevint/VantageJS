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
import Logger from './Common';
import MongoDB from './MongoDB';

export default class VantageWs {
    db:any;
    device: VPDevice;
    current: VPCurrent;
    hilows: VPHiLow;  
    onCurrent: any;
    onHighLow: any;    
    onAlert: any;
    onHistory: any;
    config: any;
    forecast: any;
    wu: Wunderground;
    alerts: Array<WeatherAlert>;    
    pauseTimer: number;
    loopTimer: any;
    hourlyTimer: any;
    
    public constructor(comPort: string, config: any) {
        this.device = new VPDevice(comPort);     
        var updateFreqMs = config.updateFrequency * 1000;
      
        this.config = config;
        this.wu = new Wunderground(config);
                    
        this.getAlerts();      

        this.device.onOpen = () => {
            this.start();   
        }

        var mongo = new MongoDB(config);
        mongo.connect().then(() => {
            this.db = mongo.db;
            Logger.info('database connected');
        })        
     
    }

    start() {
        this.hourlyUpdate(); 

        this.loopTimer = setInterval(() => {
            var last = null;
            if (this.current) {
                last = VPBase.timeDiff(this.current.dateLoaded, 's');
            }

            if (this.pauseTimer == null && (last == null || last > 5)) {
                this.beginLoop();
            }


            if (this.current) {
                console.log('temp:' + this.current.temperature + ' ' + this.current.dateLoaded);
            }

        }, 2000);

        this.hourlyTimer = setInterval(() => {
            this.hourlyUpdate();
        }, 60 * 60 * 1000);
    }

    beginLoop() {      
        this.device.isAvailable().then( ()=> {

            this.device.wakeUp().then(result => {

                this.device.readLoop(99, data => {                  
                  
                    if (VPDevice.validateCRC(data)) {
                        this.current = new VPCurrent(data);                        
                        this.wu.upload(this.current);

                        if (this.onCurrent)
                            this.onCurrent(this.current);
                    }                    
                })
            }, VantageWs.deviceError);

        }, VantageWs.deviceError);      

    }

    hourlyUpdate() {
        this.pauseLoop(60); 

        this.getHiLows(() => {

            this.updateArchives().then(() => {
                this.pauseLoop(0);
            }, err => {
                this.pauseLoop(0);
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
            this.db.collection('archive').find().sort({ "_id": -1 }).limit(1).next().then((max: VPArchive) => {
                var maxId = max._id;
                var maxDtTime = max.archiveDate + ' ' + max.archiveTime;

                this.retrieveArchives(maxDtTime).then((archives: Array<VPArchive>) => {
                    try {
                        archives.forEach((a: VPArchive) => {
                            a._id = moment(a.archiveDate + ' ' + a.archiveTime, 'MM/DD/YYYY HH:mm').unix();
                            if (a._id > maxId) {
                                this.db.collection('archive').insert(a).then(res => {
                                    console.log('inserted ' + a.archiveDate + ' ' + a.archiveTime);
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
        Logger.error(err);
    }

    getArchivesDB(startDate) {
        var dt = moment(startDate, 'MM/DD/YYYY HH:mm').unix(); 

        var promise = new Promise((resolve, reject) => {
            this.db.collection('archive').find({ "_id": { $gte: dt } }).toArray().then(res => {
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
                Logger.error('getArchives', err);
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
                        this.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');

                        if (this.onHighLow)
                            this.onHighLow(this.hilows);

                        this.getForecast();                      

                        Logger.info('hi temp:' + this.hilows.temperature.dailyHi);
                        callback(this.hilows);

                    }

                }, (err) => { Logger.error(err); callback('error')});
            });          

        }, err => {
            Logger.error('hilows device not available'); callback('error');           
        });
    }

    static deviceError(err) {
        Logger.error(err);
    }      

    getForecast(): any {      
        var last;          
      
        if (this.forecast) {
            last = VPBase.timeDiff(this.forecast.last, 'h');            
        }

        if (!last || last >= 4) {
            this.wu.getForecast().then(forecast => {
                this.forecast = forecast;
                this.hilows.forecast = forecast;                
            });            
        }
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

    pauseLoop(pauseSecs) {
        if (pauseSecs == 0 && this.pauseTimer) {
            clearTimeout(this.pauseTimer);
            this.pauseTimer = null;
            return;
        }

        this.pauseTimer = setTimeout(() => {
            this.pauseTimer = null;           
        }, pauseSecs * 1000);
    }     

    sendCommand(cmd, callback) {
        this.pauseLoop(5);

        this.device.isAvailable().then(() => {
           
            this.device.wakeUp().then(result => {                

                this.device.getSerial(cmd + '\n', 1, false).then(data => {                   
                    var result='';
                    for (var i in data) {
                        result += String.fromCharCode(data[i]);
                    }
                    callback(result);
                }, err => {                   
                });
            });
        })
    }

}
