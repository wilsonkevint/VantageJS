import DeviceReader from './DeviceReader';
import * as Common from '../VantageLib/Common';
import ClientSocket from './ClientSocket';
import VPCurrent from '../VantageLib/VPCurrent';
import Wunderground from './Wunderground';
import { setImmediate } from 'timers';
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

        this.device.currentReceived = () => {
            this.current = this.device.current;

            if (this.vp1current) {
                var dateLoaded = moment(this.vp1current, 'yyyy-mm-ddTHH:MM:ss');
                if (VPCurrent.timeDiff(dateLoaded.toDate(), 'm') < 6) {
                    this.current.temperature = this.vp1current.temperature;
                }
            }
            this.socket.socketEmit('current', this.current);            
        }

        this.device.hilowReceived = () => {
            this.hilows = this.device.hilows;
            this.getForecast().then(forecast => {
                this.forecast = forecast;
                this.hilows.forecast = this.forecast;
                this.socket.socketEmit('hilows', this.hilows);
            }).catch(err => {
                Common.Logger.error(err);
                this.socket.socketEmit('hilows', this.hilows);
                });

          
            
        };

        this.device.errorReceived = (err) => {
            this.socket.socketEmit('error', 'VantageVue:' + err);
        };

        this.server = Http.createServer((req, res) => { this.requestReceived(req, res) });       

        this.server.listen(this.config.webPort);
        console.log('web server listening on ' + this.config.webPort);        

        this.getForecast().then(forecast => {
            this.forecast = forecast;
        });
       
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
        else {
            res.end('no method');
        }
    }

    getForecast(): any {
        var last;
        var promise;

        if (this.forecast) {
            last = VPCurrent.timeDiff(this.forecast.last, 'h');
        }

        if (!last || last >= 2 || (this.forecast.periods.length && !this.forecast.periods[0].fcttext)) {
            promise = Wunderground.getForecast(this.config);
        }
        else {
            promise = Promise.resolve(this.forecast);
        }

        return promise;
    }
} 


