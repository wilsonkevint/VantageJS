declare function require(name: string); 
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

var moment = require('moment');
var http = require('http'); 
var os = require('os');
var linq = require('linq');

export default class VantageWs {
    db:any;
    station: VPDevice;
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
    loopCount: number;    
    pauseTimer: number;
    loopTimer: number;
    
    public constructor(comPort: string, config: any) {
        this.station = new VPDevice(comPort);     
        var updateFreqMs = config.updateFrequency * 1000;
      
        this.config = config;
        this.wu = new Wunderground(config);
                    
        this.getAlerts();      

        this.station.onOpen = () => {
            this.startLoop();   
        }

        var mongo = new MongoDB(config);
        mongo.connect().then(() => {
            this.db = mongo.db;
            Logger.info('database connected');
        })        
     
    }

    startLoop() {
        this.loopCount = 0;
        console.log('start loop ' + Date());

        this.loopTimer = setInterval(() => {

            if (this.loopCount <= 0) {
                this.getHiLows(() => {
                    this.loopCount = 99;
                    if (this.current) {
                        console.log('temp:' + this.current.temperature);
                    }
                    this.beginLoop();
                });
            }
            else {
                var last = null;
                if (this.current)
                    last = VPBase.timeDiff(this.current.dateLoaded, 's');

                if (last && last > 5) {
                    Logger.warn('last current loaded at ' + this.current.dateLoaded);
                    Logger.warn('restarting loop');
                    this.loopCount = 0;
                }
            }

        }, 2000);
    }

    beginLoop() {   
        //console.log('beginLoop ' + Date());
        this.station.isAvailable().then( ()=> {

            this.station.wakeUp().then(result => {
                this.station.readLoop(this.loopCount, data => {                  
                    this.loopCount--;

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

    queryArchives(key, group) {
        return {
            date: key, min: group.min(), max: group.max(), count: group.count()
        }
    }

    getArchives(startDate) {      
        if (startDate)         
            startDate = moment(startDate, "MM/DD/YYYY").format("MM/DD/YYYY"); 

        this.stopLoop(120);        

        this.station.getArchived(startDate).then(archives => { 
            var lowTemp;
         
            var hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', this.queryArchives)
            hiTemp.forEach(t => {
                console.log(t);
            });          

            try {              
                this.db.collection('archive').insertMany(archives).then(res => {
                    console.log('inserted ' + res.insertedCount);
                });
            }
            catch (e) {
                Logger.error(e);
            }

            if (this.onHistory)
                this.onHistory(archives); 

            this.restartLoop();

        },err=> {
            Logger.error('getArchives', err);
            this.restartLoop();
        }); 
    }     

    getHiLows(callback) {

        this.station.isAvailable().then(()=> {

            this.station.wakeUp().then(result => {                

                this.station.getSerial("HILOWS", 438, true).then(data => {                   

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

    stopLoop(pauseSecs) {
        if (this.loopTimer > 0) {
            clearInterval(this.loopTimer);
            this.loopTimer = 0;
        }

        this.pauseTimer = setTimeout(() => {
            this.pauseTimer = 0;
            this.startLoop(); 
        }, pauseSecs * 1000);
    }

    restartLoop() {
        if (this.pauseTimer)
            clearTimeout(this.pauseTimer);

        if (this.loopTimer)
            clearInterval(this.loopTimer);

        this.startLoop();
    }    

    sendCommand(cmd, callback) {
        this.stopLoop(5);

        this.station.isAvailable().then(() => {
           
            this.station.wakeUp().then(result => {                

                this.station.getSerial(cmd + '\n', 1, false).then(data => {
                    this.restartLoop();
                    var result='';
                    for (var i in data) {
                        result += String.fromCharCode(data[i]);
                    }
                    callback(result);
                }, err => {
                    this.restartLoop();
                });
            });
        })
    }

}

 
