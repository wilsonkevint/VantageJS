declare function require(name: string);

import vpDevice from './vpDevice';
import vpCurrent from './vpCurrent';
import vpHiLow from './vpHiLow';
import vpBase from './vpBase';
import vpArchive from './vpArchive';
import webRequest from './webRequest';
import weatherUG from './wunderGround';

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
    wunderGround: weatherUG;
        
    public constructor(comPort: string, config: any) {
        this.station = new vpDevice(comPort);
        var self = this;
        var updateFreqMS = config.updateFrequency * 1000;
      
        this.config = config;
        this.wunderGround = new weatherUG();

        this.station.onOpen = function () {
            var ctimer;           
                        
            self.getHiLows(); 

            ctimer = setInterval(function () {
                
                if (!self.pauseLoop)
                    self.getCurrent();
                else {
                    self.pauseLoop--;
                   
                }

                if (self.pauseLoop != 0)
                    console.log('pauseLoop: ' + self.pauseLoop); 
                                

            }, updateFreqMS);
        
        }

        setInterval(function () {
            self.getHiLows();
        }, 360000); 
     
    }
      

    getCurrent()  {
        var self = this;              

        self.station.isAvailable().then(function () {

        self.station.wakeUp().then(function (result) {

            self.station.getData("LOOP 1", 99, true).then(function (data) {

                if (vpDevice.validateCRC(data)) {

                    self.current = new vpCurrent(data);
                    self.wunderGround.upload(self.current);

                    if (self.onCurrent)
                        self.onCurrent(self.current);                    

                }

            }, vantageWS.deviceError);

        }, vantageWS.deviceError);
        
        }, function (err) {
            console.log('hilows device not available');
        });

    }

    queryArchives(key, group) {
        return {
            date: key, min: group.min(), max: group.max()
        }
    }

    getArchives() {
        var self = this;
        self.pauseLoop = 30 / self.config.updateFrequency;

        self.station.getArchived("09/17/2016 00:00", function (archives) {
            var hiTemp;
            var lowTemp;

            hiTemp = linq.from(archives).groupBy('$.archiveDate', '$.outTemp', self.queryArchives)
                .log("$.date + ' ' + $.min + ' ' + $.max").toJoinedString();

        }); 
    }

    getHiLows() {
        var self = this;    
        self.pauseLoop = 25 / self.config.updateFrequency;
         

        self.station.isAvailable().then(function () {

            self.station.wakeUp().then(function (result) {
                self.station.getData("HILOWS", 438,true).then(function (data) {

                    if (vpDevice.validateCRC(data)) {
                        self.hilows = new vpHiLow(data);
                        self.hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');

                        if (self.onHighLow)
                            self.onHighLow(self.hilows);

                        self.getForeCast(); 

                        self.pauseLoop = 0;

                        console.log('hi temp:' + self.hilows.outTemperature.dailyHi);
                      
                    }

                });
            });          

        }, function (err) {
            console.log('hilows device not available');
            self.pauseLoop = 0;
        });

      

    }


    static deviceError(err) {
        console.log(err);
    }
       

    getForeCast(): any {      
        var last;          

        if (this.forecast) {
            last = vpBase.timeDiff(this.forecast.last, 'h');            
        }

        if (!last || last >= 4) {
            this.wunderGround.getForeCast().then(forecast => {
            });            
        }
    }



    

    
   

   


     

}


        //rl.on('line', (input) => {
        //console.log(`Received: ${input}` + input.length);
        //  if (input.length == 0)
        //	myPort.write('\n'); 
        //  else
        //	myPort.write(input); 
        //});

