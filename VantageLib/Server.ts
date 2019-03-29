import { VPCurrent } from '../VantageLib/VPCurrent';
import { VPHiLow } from '../VantageLib/VPHiLow';
import * as Common from '../VantageLib/Common';
import QueryEngine from '../VantageLib/QueryEngine';

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
    queryEngine: QueryEngine;    

    constructor() {
        this.config = require('./VantageJS.json');
        this.queryEngine = new QueryEngine(this.config);      
    }

    start() {
        Common.Logger.init('cwop.log');
        Common.Logger.info('started'); 
        this.server = Http.createServer((req, res) => { this.requestReceived(req, res) });

        if (this.config.hostSocketServer != 'false') {
            this.io = SocketIO(this.server);
            this.io.origins = '*';
            this.io.on('connection', (socket) => this.onConnection(socket));
        }

        this.server.listen(this.config.socketPort);
        console.log('web server listening on ' + this.config.socketPort);
       
        this.clients = new Array<any>();         
    }

    onConnection(socket) {
        try {
            console.log('socket connection started');
            this.clients.push(socket);

            socket.on('alerts', (alerts) => {
                this.alerts = JSON.parse(alerts);
                this.sendAlerts();
            });

            socket.on('current', current => {
                this.current = JSON.parse(current);
                if (this.vp1current) {
                    var dateLoaded = moment(this.vp1current, 'yyyy-mm-ddTHH:MM:ss');
                    if (VPCurrent.timeDiff(dateLoaded.toDate(), 'm') < 6) {
                        this.current.temperature = this.vp1current.temperature;
                    }
                }
                this.sendCurrent();
            });

            socket.on('hilows', hilows => {
                this.hilows = JSON.parse(hilows);
                this.sendHiLows();
                if (this.alerts && this.alerts.length) {
                    this.sendAlerts();
                }
            });

            socket.on('vp1_current', (current) => {               
                this.vp1current = JSON.parse(current);
            });

            socket.on('error', (err) => {
                this.sendAll('error', err);
            });

            socket.on('archive', (dt) => {
                this.sendAll('archive', dt);
            });

            socket.on('cwop', (dt) => {
                this.sendAll('cwop', dt);
            });

            socket.on('updatewu', (dt) => {
                this.sendAll('updatewu', dt);
            });


            socket.on('disconnect', () => {
                for (var i = 0; i < this.clients.length; i++) {
                    if (this.clients[i] == socket.conn) {
                        this.clients.splice(i, 1);
                        break;
                    }
                }
            });

            if (this.current && this.hilows) {                
                setTimeout(() => {
                    this.sendHiLows();

                    if (this.alerts && this.alerts.length) {
                        this.sendAlerts();
                    }
                   
                }, 3000);
               
            }
            
        }
        catch (e) {
            console.log('webSocket:' + e);
        }
    }

    requestReceived(req, res) {
        let hdr = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
        let allowOrigins = '*';
        Common.Logger.info('WebRequest ' + moment().format('hh:mm:ss') + ' ' + req.url);        

        try {

            if (req.url == '/hilows') {
                if (this.hilows) {
                    res.writeHead(200, hdr);
                    res.end(JSON.stringify(this.hilows));
                }
                else {
                    res.writeHead(200);
                    res.end('no data');
                }
            }

            if (req.url == '/forecast') {
                if (this.hilows) {
                    res.writeHead(200, hdr);
                    res.end(JSON.stringify(this.hilows.forecast));
                }
                else {
                    res.writeHead(200);
                    res.end('no data');
                }
            }

            if (req.url.indexOf('/archives') > -1) {
                var args = req.url.split(/[&,?,=]+/);
                var startDt = null;
                var period = null;
                var ctype = 'application/json';
                if (args.length > 1)
                    startDt = decodeURI(args[2]);
                if (args.length > 2 && args[3] == 'period')
                    period = args[4];

                if (args.includes('csv'))
                    ctype = 'text/csv';

                this.queryEngine.connectDB().then(() => {
                    if (!period) {

                        this.queryEngine.getArchivesDB(startDt, 'months').then((archives: any) => {

                            res.writeHead(200, { 'Content-Type': ctype, 'Access-Control-Allow-Origin': allowOrigins });

                            if (ctype == 'application/json') {
                                res.end(JSON.stringify(archives));
                            }
                            else {
                                var data = this.getCsv(archives);
                                data.forEach(d => {
                                    res.write(d);
                                })
                                res.end();
                            }

                        });

                    }
                    else {
                        this.queryEngine.getArchivesSum(startDt, period).then(archives => {
                            res.writeHead(200, { 'Content-Type': ctype, 'Access-Control-Allow-Origin': allowOrigins });
                            if (ctype == 'application/json') {
                                res.end(JSON.stringify(archives));
                            }
                            else {
                                var data = this.getCsv(archives);
                                data.forEach(d => {
                                    res.write(d);
                                })
                                res.end();
                            }
                        });
                    }
                });

            }

            else if (req.url == '/alexa') {
                res.writeHead(200, hdr);
                try {
                    let forecast=null;
                    if (this.hilows && this.hilows.forecast) {
                        forecast = this.hilows.forecast.periods[0].fcttext.replace(new RegExp('\\d{1,3}F'), t => {
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
                    }

                    var obj = {
                        humidity: this.current.humidity.toFixed(0) + ' percent',
                        dewpoint: this.current.dewpoint.toFixed(0) + ' degrees',
                        barometer: this.current.barometer + ' ' + this.current.barometerTrend,
                        wind: this.current.windAvg + ' from ' + this.current.windDirection,
                        forecast: forecast,
                        sunrise: this.current.sunrise,
                        sunset: this.current.sunset,
                        alerts: this.alerts && this.alerts.length ? this.alerts[0].message : 'none',
                        temperature: this.current.temperature.toFixed(0) + ' degrees',
                        "inside temperature": this.current.inTemperature.toFixed(0) + ' degrees',
                        "rain": {
                            "rain rate is ": this.current.rainRate.toFixed(2),
                            "rain today is ": this.current.dayRain.toFixed(2),
                            "storm rain is ": this.current.stormRain.toFixed(2)
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
            else {
                if (this.current) {
                    res.writeHead(200, hdr);
                    res.end(JSON.stringify(this.current));
                }
                else {
                    res.writeHead(200, hdr);
                    res.end("no data");
                }
            }
        }
        catch (e) {
            Common.Logger.error('RequestReceived:' + e);
            res.end('error:' + e);
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

    sendAll(evt, obj) {
        this.clients.forEach(client => {
            client.emit(evt,obj);
        });
    }

    getCsv(archives: any) {
        var data = [];
        var headers = [];

        archives.forEach(arch => {
            var drow = '';
            if (!headers.length) {
                Object.keys(arch).forEach(col => {
                    headers.push(col);
                    drow += col + '\t';
                });
            }
            else {
                Object.keys(arch).forEach(col => {
                    if (typeof arch[col] == 'object')
                        arch[col] = JSON.stringify(arch[col]);
                    drow += arch[col] + '\t';
                });
            }
            data.push(drow + '\n');
        });

        return data;
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
        var result = null;
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

}
   