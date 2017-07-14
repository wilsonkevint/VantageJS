declare function require(name: string);
var http = require('http');
var moment = require('moment');
import Logger from './Common';
import VantageWs from './VantageWS';


export default class WebServer {
    config:any;
    server:any;
    io:any;
    ws:VantageWs;

     constructor(config, ws:VantageWs) {
        this.config = config;  
        this.ws = ws;     
    }

    start() {
         this.server = http.createServer((req,res)=> {this.requestReceived(req,res)});
        //var io = require('socket.io-client');
        this.io = require('socket.io')(this.server);        
        this.server.listen(this.config.webPort);
        this.webSocket();
    }

    requestReceived (req, res) {       
        Logger.info('WebRequest ' + moment().format('hh:mm:ss'));
        var allowOrigins  = this.config.allowOrigins[0];    
        var origin = req.headers.origin;    

        var allowOrigin = this.config.allowOrigins.filter(o => {
            if (o.includes(origin))
                return true;
            else
                return false;
        });

        if (allowOrigin.length)
            allowOrigins = allowOrigin[0];

        Logger.info(allowOrigins);    

        if (req.url == '/hilows') {
            if (this.ws.hilows) {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                res.end(JSON.stringify(this.ws.hilows));
            }
            else {
                res.writeHead(200);
                res.end("no data");
            }
        }

        if (req.url == '/forecast') {
            if (this.ws.hilows) {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                res.end(JSON.stringify(this.ws.forecast));
            }
            else {
                res.writeHead(200);
                res.end("no data");
            }
        }
        if (req.url.indexOf('/archives') > -1) {
            var args = req.url.split('='); 
            var startDt = null;
            if (args.length > 1)
                startDt = decodeURI(args[1]); 
            this.ws.getArchivesDB(startDt).then(archives => {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                res.end(JSON.stringify(archives));
            });
                
        }
        else if (req.url.indexOf('archiveint') > -1) {
            var interval = req.url.split('=');
            if (interval.length) {
                interval = interval[1];
                this.ws.sendCommand('SETPER ' + interval, result => {
                    res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': allowOrigins });
                    res.end(result);
                });
            }

        }
        else if (req.url.indexOf('alexa') > -1) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
            try {
                var obj = {
                    humidity: this.ws.current.humidity.toFixed(0),
                    dewpoint: this.ws.current.dewpoint.toFixed(0),
                    barometer: this.ws.current.barometer + ' ' + this.ws.current.barometerTrend,
                    wind: this.ws.current.windAvg + ' from ' + this.ws.current.windDirection,
                    forecast: this.ws.forecast.periods[0].fcttext,
                    sunrise: this.ws.current.sunrise,
                    sunset: this.ws.current.sunset,
                    alerts: this.ws.alerts.length ? this.ws.alerts[0].message : 'none'
                }

                obj["inside temperature"] = this.ws.current.inTemperature.toFixed(0);
                obj["temperature"] = this.ws.current.temperature.toFixed(0);
                obj["rain rate"] = this.ws.current.rainRate.toFixed(0);
                obj["rain today"] = this.ws.current.dayRain.toFixed(0);
                obj["storm rain"] = this.ws.current.stormRain.toFixed(0);
                obj["month rain"] = this.ws.current.monthRain.toFixed(0);
                res.end(JSON.stringify(obj));
            }
            catch (ex) {
                res.end("error");
            }
                 

        
        }
        else {
            if (this.ws.current) {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                res.end(JSON.stringify(this.ws.current));
            }
            else {
                res.writeHead(200);
                res.end("no data");
            }
        }
    
    }

    webSocket() {
        this.io.on('connection', (socket) => {
            Logger.info('socket connection from:' + socket.request.connection.remoteAddress)
            //Logger.info(socket.request.headers);

            if (this.ws.current)
                socket.emit('current', JSON.stringify(this.ws.current));

            if (this.ws.hilows)
                socket.emit('hilows', JSON.stringify(this.ws.hilows));

            if (this.ws.alerts)
                socket.emit('alerts', JSON.stringify(this.ws.alerts));

            socket.on('hilows', (data) => {
                Logger.info('hilows req');
                socket.emit('hilows', JSON.stringify(this.ws.hilows));
            });

       	    socket.on('message',
                (msgtype,msg) => {				 
                    this.io.sockets.emit('alert', msg);
                });

        });
    }

    emit(name,obj) {
        this.io.sockets.emit(name, JSON.stringify(obj));
    }

    clientSocket() {   
        var post_data = JSON.stringify({client:'weathervsw'});
        var token = '';

        var request = http.request({
            host: 'rpizero',
            port: '9002',
            path: '/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': post_data.length
            }
        }, resp => {
            resp.on('data', chunk => {
                token += chunk;
            })
            resp.on('end', () => {
                var socket = io('http://rpizero:9002');

                socket.on('connect', () => {
                    Logger.info('connected');
                    socket
                        .emit('authenticate', { token: token })
                        .on('authenticated', () => {
                            Logger.info('authenticated');
                            socket.on('current', (x) => {
                                socket.emit('oncurrent', ws.current);
                            });
                        })
                        .on('unauthorized', (msg) => {
                            Logger.info("unauthorized: " + JSON.stringify(msg.data));                     
                        })
                   
                });
            });
        }
        );

        request.write(post_data);
        request.end();
    }
}