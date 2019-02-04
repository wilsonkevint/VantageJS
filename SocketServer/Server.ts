const http = require('http');
const url = require('url');
const moment = require('moment');
const config = require('./config.json');
const io = require('socket.io');
const windDir = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
 
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
        this.io = io(this.server);
        this.io.origins = '*';
        
        
        this.server.listen(config.port);
        console.log('web server listening on ' + config.port);
        this.io.on('connection', (socket) => this.onConnection(socket));
        this.wsclients = new Array<any>();
        this.alerts = [];       

        //this.getTestData('');
        //this.getTestData('hilows');
    }

    onConnection(socket) {
        try {
            console.log('socket connection started'); 
                    

            try {
                var client = socket.request._query.client;
                console.log('client:' + client);

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
                            if (this.alerts && this.alerts.length)
                                socket.emit('alerts', this.alerts);
                        }
                    }
                }
                


            }
            catch (e) {
                console.log(e);
            }

            socket.on('current', (current) => {
                            
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

            socket.on('vp1_current', (current) => {
                console.log('vp1_current', current);
                if (this.vwsSocket)
                    this.vwsSocket.emit('vp1_current', current);
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
        //console.log('origin ' + origin);
        var allowOrigin = config.allowOrigins.filter(o => {
            if (o.includes(origin))
                return true;
            else
                return false;
        });

        if (allowOrigin.length) {
            allowOrigins = allowOrigin[0];
        }
                
        var urlp = url.parse(req.url);
        var cmd = urlp.pathname.split('/');
        cmd = cmd[cmd.length - 1];
        var qrystr = urlp.query;
            

        try {

            if (cmd == 'hilows') {
                if (this.hilows) {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                    res.end(JSON.stringify(this.hilows));
                }
                else {
                    res.writeHead(200);
                    res.end("no data");
                }
            }

            if (cmd == 'forecast') {
                if (this.hilows) {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                    res.end(JSON.stringify(this.hilows.forecast.periods[0].fcttext));
                }
                else {
                    res.writeHead(200);
                    res.end("no data");
                }
            }          
            
            else if (cmd == 'alexa') {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                try {
                    var forecast = this.hilows.forecast.periods[0].fcttext.replace(new RegExp('\\d{1,3}F'), t => {
                        return t.replace('F', ' degrees');
                    });
                    var patt = new RegExp('Winds (N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)');
                    forecast = forecast.replace(patt, dir => {
                        dir = dir.substr(6)
                            .replace(new RegExp('N', 'g'), ' North')
                            .replace(new RegExp('E', 'g'), ' East')
                            .replace(new RegExp('S', 'g'), ' South')
                            .replace(new RegExp('W', 'g'), ' West')
                        return 'Winds ' + dir;
                    });

                    var obj = {
                        humidity: this.current.humidity.toFixed(0) + ' percent',
                        dewpoint: this.current.dewpoint.toFixed(0) + ' degrees',
                        barometer: this.current.barometer + ' ' + this.current.barometerTrend,
                        wind: this.current.windAvg + ' from ' + this.current.windDirection,
                        forecast: forecast,
                        sunrise: this.current.sunrise,
                        sunset: this.current.sunset,
                        alerts: this.alerts.length ? this.alerts[0].message : 'none',
                        temperature: this.current.temperature.toFixed(0) + ' degrees',
                        "inside temperature": this.current.inTemperature.toFixed(0) + ' degrees',
                        "rain": {
                            "rain rate is ": this.current.rainRate.toFixed(2),
                            "rain today is ": this.current.dayRain.toFixed(2),
                            "storm rain is " : this.current.stormRain.toFixed(2)                           
                        },
                        "today": {
                            "high": "temperature was " + this.hilows.temperature.dailyHi.toFixed(0) + ' degrees at ' + this.hilows.temperature.dailyHighTime,
                            "low": "temperature was " + this.hilows.temperature.dailyLow.toFixed(0) + ' degrees at ' + this.hilows.temperature.dailyLowTime
                        },
                        "month rain": this.current.monthRain.toFixed(0),
                        "rain today": this.getRainDay('today'),
                        "rain tonight": this.getRainDay('tonight'),
                        "rain tomorrow": this.getRainDay('tomorrow')

                    }

                    res.end(JSON.stringify(obj));
                }
                catch (ex) {
                    res.end("error");
                }
            }            
            else if (cmd == '') {
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
                //res.writeHead(405);
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

    getRainDay(period) {
        var indx = 0;      
        var indxevn = 1;
        var indxtom = 2;

        var forecast = this.hilows.forecast.periods[indx];
       
        if (forecast.title.endsWith('Night')) {
            indxevn = 0;
            indxtom = 1;
        }

        switch (period) {
            case "today":               
                break;
            case "tonight":
                indx = indxevn;
                break;
            case "tomorrow":
                indx = indxtom;
                break;
        }
        var forecasts = this.hilows.forecast.periods[indx].fcttext.split('.');
        var rainPct = /rain\s{1,3}\d{1,3}%/i;
        var showers = /shower/i;
        var rain = /rain/i;

        var patts = [rainPct, showers, rain];
        var result=null;
        for (var i = 0; i < patts.length; i++) {
            var patt = patts[i];
            if (patt.test(forecasts)) {
                result = patt.exec(forecasts)[0];
                forecasts.forEach(fc => {
                    if (fc.indexOf(result) > -1) {
                        result = fc;
                    }
                });
                break;
            }            
        }

        if (result)
            return result;
        else
           return 'no rain is in forecast';
        

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

    getTestData(path) {
        var options = {
            host: 'hpmini1',
            port: 9000,
            path: '/' + path,
            method: 'get',
            timeout: 4000           
        }
        var result = '';

        var request = http.request(options, (response) => {
            response.on('data', (chunk, len) => {

                result += String.fromCharCode.apply(null, chunk);
                //if (resultData.length == this.headers['content-length'] || !this.headers['content-length'])
                //resolve(resultData);

            });
            response.on('timeout', (socket) => {
                
            });
            response.on('error', (err) => {
                var errstr = err;
            });
            response.on('end', () => {
                var obj = JSON.parse(result);
                if (path == 'hilows')
                    this.hilows = obj;
                else
                    this.current = obj;
            })
        });

        request.end();
    }

}