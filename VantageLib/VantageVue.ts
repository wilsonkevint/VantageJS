import DeviceReader from './DeviceReader';
import * as Common from '../VantageLib/Common';
import ClientSocket from './ClientSocket';
import VPCurrent from '../VantageLib/VPCurrent';
const os = require('os');
const moment = require('moment');
const Http = require('http');

export default class VantageVue {
    current;
    hilows;
    vp1current;
    device: DeviceReader;
    socket: ClientSocket;
    config: any;
    server: any; 

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
            console.log('current emit');
        }

        this.device.hilowReceived = () => {
            this.hilows = this.device.hilows;
            this.socket.socketEmit('hilows', this.hilows);
        };

        this.device.errorReceived = (err) => {
            this.socket.socketEmit('error', 'VantageVue:' + err);
        };

        this.server = Http.createServer((req, res) => { this.requestReceived(req, res) });       

        this.server.listen(this.config.webPort);
        console.log('web server listening on ' + this.config.webPort);
    }

    requestReceived(req, res) {
        if (req.url.indexOf('/archives') == 0) {
            var args = req.url.split(/[&,?,=]+/);
            var startDt = null;         
            var ctype = 'application/json';
            res.writeHead(200, { "Content-Type": ctype, "Access-Control-Allow-Origin": "*" });
            if (args.length > 1) {
                startDt = decodeURI(args[2]);
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
    }
}


