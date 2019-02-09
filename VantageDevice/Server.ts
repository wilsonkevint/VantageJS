import DeviceReader from "./DeviceReader";
import VPCurrent from "../VantageLib/VPCurrent";
import VPHiLow from "../VantageLib/VPHiLow";

const SerialPort = require("serialport");
const Http = require('http');
const SocketIO = require('socket.io');
const moment = require('moment');

export default class Server {
    server: any;
    io: any;
    vwsSocket: any;
    hilows: VPHiLow;
    current: VPCurrent;
    vp1current: VPCurrent;
    alerts: any;
    lastContact: any;
    clients: Array<any>;
    config: any;
    device: DeviceReader;

    constructor(config, device) {
        this.config = config;
        this.device = device;
    }

    start() {
        this.server = Http.createServer((req, res) => { this.requestReceived(req, res) });
        this.io = SocketIO(this.server);
        this.io.origins = '*';

        this.server.listen(this.config.socketPort);
        console.log('web server listening on ' + this.config.socketPort);
        this.io.on('connection', (socket) => this.onConnection(socket));
        this.clients = new Array<any>();

        this.device.currentReceived = () => {
            this.current = this.device.current;
           
            if (this.vp1current) {
                var dateLoaded = moment(this.vp1current,'yyyy-mm-ddTHH:MM:ss');
                if (VPCurrent.timeDiff(dateLoaded.toDate(), 'm') < 6) {
                    this.current.temperature = this.vp1current.temperature;
                }
            }
            this.sendCurrent();
        }
        this.device.hilowReceived = () => {
            this.hilows = this.device.hilows;
            this.sendHiLows();
        };
    }

    onConnection(socket) {
        try {
            console.log('socket connection started');
            this.clients.push(socket);

            socket.on('alerts', async (alerts) => {
                this.alerts = alerts;
                this.sendAlerts();
            });

            socket.on('vp1_current', (current) => {               
                this.vp1current = current;
            });

            socket.on('disconnect', () => {
                for (var i = 0; i < this.clients.length; i++) {
                    if (this.clients[i] == socket.conn) {
                        this.clients.splice(i, 1);
                        break;
                    }
                }
            });
        }
        catch (e) {
            console.log('webSocket:' + e);
        }
    }

    requestReceived(req, res) {
        let hdr = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

        if (req.url == '/status') {
            res.writeHead(200, hdr);
            res.end(JSON.stringify(
                {
                    lastLoop: this.device.lastLoop,
                    lastHiLow: this.device.hilows ? this.device.hilows.dateLoaded : null,
                    errors: ''
                }));
        }

        else if (req.url == '/current') {
            res.writeHead(200, hdr);
            res.end(JSON.stringify(this.device.current));
        }

        else if (req.url == '/hilows') {
            res.writeHead(200, hdr);
            res.end(JSON.stringify(this.device.hilows));
        }

        else if (req.url.indexOf('/archives') == 0) {
            let parms = req.url.split('=');
            let archdt = parms.length > 1 ? decodeURI(parms[1]) : null;
            res.writeHead(200, hdr);
            try {
                let archives = this.device.getArchives(archdt).then(archives => {
                    res.end(JSON.stringify(archives));
                });
            }
            catch (err) {
                res.end(err);
            }
            res.end(JSON.stringify(this.device.hilows));
        }

    }

    sendCurrent() {
        this.clients.forEach(client => {
            client.emit('current', this.current);
        });
    }

    sendHiLows() {
        this.clients.forEach(client => {
            client.emit('hilows', this.hilows);
        });
    }

    sendAlerts() {
        this.clients.forEach(client => {
            client.emit('alerts', this.alerts);
        });
    }

}
   