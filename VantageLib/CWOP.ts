//CWOP - updates CWOP web service 
declare function require(name: string);
let net = require('net');
let moment = require('moment');
import { VPCurrent } from './VPCurrent';
import { VPHiLow } from './VPHiLow';
import VPArchive from './VPArchive';
import * as Common from './Common';
import Database from './Database';
import QueryEngine from './QueryEngine';
import ClientSocket from './ClientSocket';

export default class CWOP {
    config: any;   
    current: VPCurrent;
    client: any;
    hilows: VPHiLow;
    cwopUpdated: boolean;
    queryEngine: QueryEngine;
    socket: ClientSocket;
    
    constructor(socket: ClientSocket) {
        this.config = require('./VantageJS.json');
        this.queryEngine = new QueryEngine();
        this.socket = socket;
    }
     
    update(current: VPCurrent, hilows: VPHiLow) {       
        let Util = Common.Util;       
        this.cwopUpdated = false;
        this.current = current;
        this.hilows = hilows;
        this.client = new net.Socket();
       
        let promise = new Promise((resolve, reject) => {
            try {
                this.client.connect(14580, 'cwop.aprs.net', () => {                 
                    console.log('Connected to cwop');
                    this.client.write('user ' + this.config.CWOPId + ' pass -1 vers VantageJS 1.0\r\n');            //login to cwop
                });

                this.client.on('data', data => {
                
                    if (this.dataReceived(data)) {     
                        this.cwopUpdated = true;
                        this.socket.socketEmit('cwop', current.dateLoaded);
                        try {
                            let now = moment(current.dateLoaded);
                            this.queryEngine.database.update('cwopUpdated', { _id: 1, lastUpdate: now.unix() }, true);
                        }
                        catch (err) {
                            Common.Logger.error(err);
                        }

                        this.closeClient();
                        resolve(this.cwopUpdated);
                    }
                });

                this.client.on('error', error => {
                    this.closeClient();
                    reject(error);
                });

                this.client.on('close', () => {
                    console.log('cwop Connection closed');
                    if (!this.cwopUpdated) {
                        this.closeClient();
                        reject('cwop not updated');
                    }
                });
            }
            catch (e) {
                Common.Logger.error(e);
            }
            
        });

        return promise;
        
    }    

    closeClient() {     
        if (!this.client.destroyed) {
            this.client.destroy();
        }
    }

    dataReceived(data) {
        let resp = String.fromCharCode.apply(null, data);
        let timeStr = moment(this.current.dateLoaded).utc().format('DDHHmm');
        let Util = Common.Util;
        let updated = false;
        
        if (resp.indexOf('logresp') > -1) {
            let baromb = this.current.barometer * 33.8637526 * 10;
            let humidity = this.current.humidity == 100 ? 0 : this.current.humidity;
           
            let updateStr = this.config.CWOPId + '>APRS,TCPIP*:@' + timeStr + 'z'
                + this.config.CWLatitude + '/' + this.config.CWLongitude
                + '_' + this.formatNum(this.current.windDir, 3)
                + '/' + this.formatNum(this.current.windAvg, 3)
                + 'g' + this.formatNum(this.current.windSpeed, 3)
                + 't' + this.formatNum(this.current.temperature, 3)
                + 'r' + this.formatNum(this.hilows.rain1hour, 3)
                + 'p' + this.formatNum(this.hilows.rain24hour, 3) 
                + 'P' + this.formatNum(this.current.dayRain * 100, 3)
                + 'b' + this.formatNum(baromb, 5)
                + 'h' + this.formatNum(humidity, 2);

            console.log(updateStr);

            try {
                this.client.write(updateStr + '\n\r');
                updated = true;
            }
            catch (ex) {
                Common.Logger.error(ex);
            }          
            return updated;
        }        
    }

    formatNum(num, len) {
        return Common.Util.padZero(Common.Util.round(num, 0), len);
    }

    async updateFromArchive() {
        let lastDt = null;
        let dayRain;
        let updated = await this.queryEngine.database.find('cwopUpdated', { _id: 1 }).next();

        if (updated == null) {
            return;
        }

        let csr = this.queryEngine.database.sort('archive', { _id: { $gt: updated.lastUpdate } }, { _id: 1 });
        let archives = await csr.toArray();

        try {

            if (updated != null) {

                await (async () => {
                    for (let a = 0; a < archives.length; a++) {
                        let arch = archives[a];
                        if (!lastDt || lastDt != arch.archiveDate) {
                            dayRain = 0;
                            lastDt = arch.archiveDate;
                        }
                        if (arch.rainClicks > 0)
                            dayRain += arch.rainClicks / 100;

                        if (arch._id > updated.lastUpdate) {
                            let curr = new VPCurrent(null);
                            curr.barometer = arch.barometer;
                            curr.dayRain = dayRain;
                            curr.humidity = arch.humidity;
                            curr.rainRate = (arch.rainClicks / 100) * 4;          //rainClicks / 100 * archival frequency of every 15 mins
                            curr.temperature = arch.outTemp;
                            curr.windAvg = arch.windAvg;
                            curr.windDir = arch.prevWindDir;
                            curr.windSpeed = arch.windHi;
                            curr.dewpoint = VPCurrent.fDewpoint(curr.temperature, curr.humidity);
                            curr.dateLoaded = moment(arch.archiveDate + ' ' + arch.archiveTime, "MM/DD/yyyy HH:mm").toDate();

                            let hilows = new VPHiLow(null);
                            let rain = await this.queryEngine.getRainTotals(curr.wuUpdated);
                            hilows.rain24hour = rain.last24;
                            hilows.rain1hour = rain.hourly;

                            try {
                                await this.update(curr, hilows);
                                Common.Logger.info('updateFromArchive:', curr.dateLoaded.toString());
                            }
                            catch (err) {
                                Common.Logger.error(err);
                            }
                        }
                    }
                })();

                console.log('finished');

            }
        }
        catch (err) {
            Common.Logger.error(err);
            throw err;
        }
       

    }


    
}