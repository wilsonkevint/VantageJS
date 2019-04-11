import DeviceReader from './DeviceReader';
import * as Common from './Common';
import ClientSocket from './ClientSocket';
import { VPBase } from './VPBase';
import Wunderground from './Wunderground';
import { setImmediate } from 'timers';
import WebRequest from './WebRequest';

const os = require('os');
const moment = require('moment');
const Http = require('http');
const querystring = require('querystring');

export default class VantageVue {
    current;
    hilows;
    vp1current;
    device: DeviceReader;
    socket: ClientSocket;
    config: any;
    server: any; 
    forecast: any;

    public constructor() {
        this.config = require('./VantageJS.json');
    }

    start() {
        Common.Logger.init('vantagejs.log');
        Common.Logger.info('started');

        this.config.comPort = this.config[os.platform() + '_serialPort'];

        this.device = new DeviceReader();
        this.device.start();

        this.socket = new ClientSocket();
        this.socket.start();

        this.device.subscribeCurrent((current) => {
            this.current = current;

            if (this.vp1current) {
                var dateLoaded = moment(this.vp1current, 'yyyy-mm-ddTHH:MM:ss');
                if (VPBase.timeDiff(dateLoaded.toDate(), 'm') < 6) {
                    this.current.temperature = this.vp1current.temperature;
                }
            }
            this.socket.socketEmit('current', this.current);
        });

        this.device.subscribeHiLow((hilows) => {
            this.hilows = hilows;
            this.getForecast().then(forecast => {
                if (forecast) {
                    this.forecast = forecast;                    
                }
                this.hilows.forecast = this.forecast;
                this.socket.socketEmit('hilows', this.hilows);
            }, err => {
                Common.Logger.error(err);
                this.socket.socketEmit('hilows', this.hilows);
            });
         
        });

        this.device.subscribeError( (err) => {
            this.socket.socketEmit('error', 'VantageVue:' + err);
        });

        this.server = Http.createServer((req, res) => { this.requestReceived(req, res) });       

        this.server.listen(this.config.webPort);
        console.log('web server listening on ' + this.config.webPort);        
 
       
    }

    requestReceived(req, res) {
        if (req.url.indexOf('/archives') == 0) {
            var args = req.url.split('?');
            var startDt = null;
            var ctype = 'application/json';
            res.writeHead(200, { "Content-Type": ctype, "Access-Control-Allow-Origin": "*" });
            if (args.length > 0) {
                let obj = querystring.parse(args[1]);
                startDt = obj.dt;
            }
            else {
                res.end('date required');
            }

            this.device.getArchives(startDt).then(archives => {
                res.end(JSON.stringify(archives));

            }).catch(err => {
                res.end(err);
            });
        }
        else if (req.url == '/current') {
            res.end(JSON.stringify(this.current));
        }
        else if (req.url == '/hilows') {
            res.end(JSON.stringify(this.hilows));
        }
        else if (req.url == '/forecast') {
            res.end(JSON.stringify(this.forecast));
        }
        else {
            res.end('no method');
        }
    }

     getForecast(): Promise<any> {
         var last = null;
        var forecast;

         if (this.forecast) {
             last = VPBase.timeDiff(this.forecast.last, 'h');
        }

         let promise = new Promise<any>((resolve, reject) => {
             if (last==null || last >= 2 || (this.forecast.periods.length == 0)) {

                 WebRequest.get(this.config.forecastUrl).then(data => {

                     let wforecast = JSON.parse(data).daypart[0];
                     let result = { last: new Date(), periods: [] };

                     wforecast.daypartName.forEach(period => {
                         let idx = result.periods.length;
                         let fcast = { name: period, text: wforecast.narrative[idx] }
                         result.periods.push(fcast);
                         idx++;
                     });

                     resolve(result);

                 }, err => reject(err));
             }
             else {
                 resolve();
             }
         });

        
        return promise;
    }
} 


