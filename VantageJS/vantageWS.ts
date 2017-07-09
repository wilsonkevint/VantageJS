﻿declare function require(name: string);

import VPDevice from './VPDevice';
import VPCurrent from './VPCurrent';
import VPHiLow from './VPHiLow';
import VPBase from './VPBase';
import VPArchive from './vpArchive';
import WebRequest from './WebRequest';
import Wunderground from './Wunderground';
import WeatherAlert from './WeatherAlert';

var moment = require('moment');
var http = require('http'); 
var os = require('os');
var linq = require('linq');

export default class VantageWs {
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
    pauseLoop: boolean;
    
    public constructor(comPort: string, config: any) {
        this.station = new VPDevice(comPort);     
        var updateFreqMs = config.updateFrequency * 1000;
      
        this.config = config;
        this.wu = new Wunderground(config);
        this.loopCount = 0;
      
        this.getAlerts();
       

        this.station.onOpen = ()=> {                       
            this.getHiLows();
          
            var ctimer = setInterval(() => {
                if (this.loopCount == 0 && !this.pauseLoop) {
                    this.loopCount = 100;
                    console.log('start loop');
                    this.getCurrent();
                }

                if (this.loopCount > 0)
                    this.loopCount--;
            }, 2500);
        
        }

        setInterval(() => {
            this.getHiLows();
        }, 60*60*1000); 
     
    }
    
    getCurrent()  {         

        this.station.isAvailable().then( ()=> {

            this.station.wakeUp().then(result => {               
                this.station.readLoop(99, data => {
                    //console.log('loopcnt ' + this.loopCount);
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
            date: key, min: group.min(), max: group.max()
        }
    }

    getArchives() {      
        var startDate = (moment().add(-4, 'hours').format("MM/DD/YYYY HH:mm"));
        this.pauseLoop = true;         

        this.pauseTimer = setInterval(() => {
            this.pauseLoop = false;           
        }, 120000);

        this.station.getArchived(startDate, archives => { 
            var lowTemp;
         
            //var hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', this.queryArchives)
            //    .log("$.date + ' ' + $.min + ' ' + $.max").toJoinedString();

            //console.log('archives hi temp' + hiTemp);

            if (this.onHistory) {               
                this.onHistory(archives);
            }

            if (this.pauseTimer) {
                clearInterval(this.pauseTimer)
                this.pauseLoop = false;
                this.loopCount = 0;
                this.pauseTimer = 0;
            }

        }); 
    }     

    getHiLows() {
        
        this.station.isAvailable().then(()=> {

            this.station.wakeUp().then(result => {
                this.pauseLoop = true;

                this.station.getData("HILOWS", 438, true).then(data => {              
                    this.pauseLoop = false;
                    this.loopCount = 0;

                    if (VPDevice.validateCRC(data)) {
                        this.hilows = new VPHiLow(data);
                        this.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');

                        if (this.onHighLow)
                            this.onHighLow(this.hilows);

                        this.getForeCast();
                       

                        console.log('hi temp:' + this.hilows.temperature.dailyHi);

                    }

                }, () => { this.pauseLoop = false; });
            });          

        }, err => {
            console.log('hilows device not available');           
        });

      

    }


    static deviceError(err) {
        console.log(err);
    }
       

    getForeCast(): any {      
        var last;          
      
        if (this.forecast) {
            last = VPBase.timeDiff(this.forecast.last, 'h');            
        }

        if (!last || last >= 4) {
            this.wu.getForeCast().then(forecast => {
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

}


        //rl.on('line', (input) => {
        //console.log(`Received: ${input}` + input.length);
        //  if (input.length == 0)
        //	myPort.write('\n'); 
        //  else
        //	myPort.write(input); 
        //});

