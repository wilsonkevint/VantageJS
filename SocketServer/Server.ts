const http = require('http');
const moment = require('moment');
const config = require('./config.json');
 
export default class Server {
    server:any;
    io: any;
    vwsSocket: any;
    wsclients: Array<any>;
    hilows: any;
    current: any;
    alerts: any;
    lastContact: any;

    start() {
        this.server = http.createServer((req,res)=> {this.requestReceived(req,res)});     
        this.io = require('socket.io')(this.server);        
        this.server.listen(config.port);
        console.log('web server listening on ' + config.port);
        this.io.on('connection', (socket) => this.onConnection(socket));
        this.wsclients = new Array<any>();
    }

    onConnection(socket) {
        try {
            console.log('socket connection from:' + socket.request.headers.origin);
            console.log(socket.request._query);

            try {
                var client = socket.request._query.client;
                if (client == 'vantagejs') {
                    this.vwsSocket = socket;                  
                }
                else if (client == "wsclient" || client == null) {
                    if (this.wsclients.indexOf(socket) == -1) {
                        this.wsclients.push(socket);                      

                        if (this.lastContact && Server.timeDiff(this.lastContact, 's') <= 30) {
                            if (this.current)
                                socket.emit('current', this.current);
                            if (this.hilows)
                                socket.emit('hilows', this.hilows);
                            if (this.alerts)
                                socket.emit('alerts', this.alerts);
                        }
                    }
                }


            }
            catch (e) {
                console.log(e);
            }

            socket.on('current', (current) => {
                //console.log('current', current);
               
                this.lastContact = new Date();
                if (socket == this.vwsSocket) {
                    this.current = typeof current == 'string' ? JSON.parse(current) : current;
                    this.wsclients.forEach(client => {
                        client.emit('current', current);
                    });
                }
            });

            socket.on('hilows', (hilows) => {
                this.lastContact = new Date();
                
                if (socket == this.vwsSocket) {
                    this.hilows = typeof hilows == 'string' ? JSON.parse(hilows) : hilows;
                    this.wsclients.forEach(client => {
                        client.emit('hilows', hilows);
                    });
                }
            });  

            socket.on('alerts', (alerts) => {                
                if (socket == this.vwsSocket) {
                    this.alerts = alerts;
                    this.wsclients.forEach(client => {
                        client.emit('alerts', alerts);
                    });
                }
            });  

            socket.on('disconnect', (data) => {
                for (var i = 0; i < this.wsclients.length; i++) {
                    if (this.wsclients[i] == socket.conn) {
                        this.wsclients.splice(i, 1);      
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
        var allowOrigins = config.allowOrigins[0];
        var origin = req.headers.origin;
        console.log('origin ' + origin);
        var allowOrigin = config.allowOrigins.filter(o => {
            if (o.includes(origin))
                return true;
            else
                return false;
        });

        if (allowOrigin.length)
            allowOrigins = allowOrigin[0];

        try {

            if (req.url == '/hilows') {
                if (this.hilows) {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                    res.end(JSON.stringify(this.hilows));
                }
                else {
                    res.writeHead(200);
                    res.end("no data");
                }
            }

            if (req.url == '/forecast') {
                if (this.hilows) {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                    res.end(JSON.stringify(this.hilows.forecast.periods[0].fcttext));
                }
                else {
                    res.writeHead(200);
                    res.end("no data");
                }
            }          
            else if (req.url == '/phone') {
                var body = '';
                req.on('data', data => {
                    body += data;
                });
                req.on('end', () => {
                    var msg = JSON.parse(body);
                    msg.source = 'phone';
                    this.emit('alert', msg);
                });
            }
            else if (req.url == '/alexa') {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                try {
                    var obj = {
                        humidity: this.current.humidity.toFixed(0),
                        dewpoint: this.current.dewpoint.toFixed(0),
                        barometer: this.current.barometer + ' ' + this.current.barometerTrend,
                        wind: this.current.windAvg + ' from ' + this.current.windDirection,
                        forecast: this.hilows.forecast.periods[0].fcttext,
                        sunrise: this.current.sunrise,
                        sunset: this.current.sunset,
                        alerts: this.alerts.length ? this.alerts[0].message : 'none',
                        temperature: this.current.temperature.toFixed(0),
                        "inside temperature": this.current.inTemperature.toFixed(0),
                        "rain rate": this.current.rainRate.toFixed(0),
                        "rain today": this.current.dayRain.toFixed(0),
                        "storm rain": this.current.stormRain.toFixed(0),
                        "month rain": this.current.monthRain.toFixed(0)
                    }

                    res.end(JSON.stringify(obj));
                }
                catch (ex) {
                    res.end("error");
                }
            }
            else if (req.url == '/') {
                if (this.current) {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                    res.end(JSON.stringify(this.current));
                }
                else
                {
                    res.end('no data')
                }
            }
            else {
                res.writeHead(405);
                res.end("no method");
            }
        }
        catch (e) {
            console.log('RequestReceived:' + e);
        }

    } 

    emit(name, obj) {
        try {
            if (typeof obj == 'string')
                this.io.sockets.emit(name, obj);
            else
                this.io.sockets.emit(name, JSON.stringify(obj));
        }
        catch (e) {
           console.log('WebServer.emit' + e);
        }
    }

    static timeDiff(dt: Date, type: string): number {
        var diff = new Date().getTime() - dt.getTime();
        diff = Math.abs(diff);
        var seconds = Math.floor(diff / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);

        switch (type) {
            case 'h':
                diff = hours;
                break;
            case 'm':
                diff = minutes;
                break;
            case 's':
                diff = seconds;
                break;

        }

        return diff;
    }

}