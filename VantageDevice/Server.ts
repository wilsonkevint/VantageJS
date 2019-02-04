import DeviceReader from "./DeviceReader";

const SerialPort = require("serialport");
const Http = require('http');
const SocketIO = require('socket.io');

export default class Server {
    server: any;
    io: any;
    vwsSocket: any; 
    hilows: any;
    current: any;   
    lastContact: any;
    clients: Array<any>;
    config: any;
    device: DeviceReader;

    constructor(config,device) {
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
            this.sendCurrent();
        }
        this.device.hilowReceived = () => {
            this.sendHiLows()
        };
    }

    onConnection(socket) {
        try {
            console.log('socket connection started');
            this.clients.push(socket); 

            socket.on('wakeup', async (data) => {
                var client = data.client;
                console.log('client:' + client);

                if (client == 'vantagejs') {
                    try {
                        let data = await this.device.wakeUp();
                        socket.emit('wakeup_resp',data);
                    }
                    catch (err) {
                        socket.emit('wakeup_error');
                    }
                }
            });

            socket.on('isavailable', async () => {
                try {
                    let isAvail = await this.device.isAvailable();
                    socket.emit('isavaiable_resp', isAvail);
                }
                catch (err) {
                    socket.emit('isavailable_error', err);
                }
            });

            socket.on('archives', async (data) => {
                try {
                    let startDate = data.startDate;
                    let archives = await this.device.getArchives(startDate);
                    socket.emit('archives_resp', archives);
                }
                catch (err) {
                    socket.emit('isavailable_error', err);
                }
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
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(
            {
                lastLoop: this.device.lastLoop,
                lastHiLow: this.device.lastLoop,
                errors: this.device.lastLoop
            }));
    }    

    sendCurrent() {
        this.clients.forEach(client => {
            client.emit('current', { data: this.device.current });
        });
    }

    sendHiLows() {
        this.clients.forEach(client => {
            client.emit('hilows', { data: this.device.hilows });
        });
    }
}