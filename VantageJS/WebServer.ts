declare function require(name: string);
const http = require('http');
const moment = require('moment');
const url = require('url');
import * as Common from './Common';
import VantageWs from './VantageWS';

export default class WebServer {
    config:any;
    server:any;
    io: any;
    socket: any;
    ws:VantageWs;

     constructor(config, ws:VantageWs) {
        this.config = config;  
        this.ws = ws;     
    }

    start() {
         this.server = http.createServer((req,res)=> {this.requestReceived(req,res)});
        this.io = require('socket.io-client');
        //this.io = require('socket.io')(this.server);        
        this.server.listen(this.config.webPort);
        Common.Logger.info('web server listening ' + this.config.webPort);
        //this.webSocket();
        this.socket = this.clientSocket();

        this.ws.onCurrent(current => {
            this.emit('current', current);
        });
        this.ws.onHighLow(hilows => {
            this.emit('hilows', hilows);
        });
        this.ws.onAlert(alerts => {
            this.emit('alerts', alerts);
        });
    }

    requestReceived (req, res) {       
        Common.Logger.info('WebRequest ' + moment().format('hh:mm:ss'));
        var allowOrigins  = this.config.allowOrigins[0];    
        var origin = req.headers.origin;    
        console.log('origin:' + origin);

        var allowOrigin = this.config.allowOrigins.filter(o => {
            if (o.includes(origin))
                return true;
            else
                return false;
        });

        if (allowOrigin.length)
            allowOrigins = allowOrigin[0];

        Common.Logger.info(allowOrigins);   
        try {

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
            if (req.url == '/gettime') {
                res.writeHead(200);


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

                if (!period) {
                    this.ws.queryEngine.getArchivesDB(startDt, 'months').then((archives: any) => {

                        res.writeHead(200, { 'Content-Type': ctype, 'Access-Control-Allow-Origin': allowOrigins });
                        //var temps = this.ws.queryEngine.archiveGroupBy(archives, 'archiveDate', 'outTemp');
                        //var results = []
                        //temps.forEach(t => {
                        //    results.push((t));
                        //})

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
                    this.ws.queryEngine.getArchivesSum(startDt, period).then(archives => {
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
           
            else if (req.url == '/schedule') {
                var urlp = url.parse(req.url);                 
                var parm = urlp.query.split('=');
                var result = '';
                if (parm.length == 2) {
                    
                }

            }
            else {
                if (this.ws.current) {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                    res.end(JSON.stringify(this.ws.current));
                }
                else {
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                    res.end("no data");
                }
            }
        }
        catch (e) {
            Common.Logger.error('RequestReceived:' + e);
        }
    
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

    //webSocket() {
    //    this.io.on('connection', (socket) => {
    //        try {
    //            Common.Logger.info('socket connection from:' + socket.request.connection.remoteAddress)
    //            //Common.Logger.info(socket.request.headers);

    //            if (this.ws.current)
    //                socket.emit('current', JSON.stringify(this.ws.current));

    //            if (this.ws.hilows)
    //                socket.emit('hilows', JSON.stringify(this.ws.hilows));

    //            if (this.ws.alerts)
    //                socket.emit('alerts', JSON.stringify(this.ws.alerts));

    //            socket.on('hilows', (data) => {
    //                Common.Logger.info('hilows req');
    //                socket.emit('hilows', JSON.stringify(this.ws.hilows));
    //            });

    //            socket.on('message',
    //                (msgtype, msg) => {
    //                    this.io.sockets.emit('message', msg);
    //                });
    //        }
    //        catch (e) {
    //            Common.Logger.error('webSocket:' + e);
    //        }

    //    });
    //}

    emit(name, obj) {
        try {
            //this.io.sockets.emit(name, JSON.stringify(obj));
            this.socket.emit(name, JSON.stringify(obj));
        }
        catch (e) {
            Common.Logger.error('WebServer.emit' + e);
        }
    }

    clientSocket() {   
        /* for logging in and getting a token
        var post_data = JSON.stringify({client:'weathervsw'});
        var token = '';

        var request = http.request({
            host: 'localhost',
            port: '9000',
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
        */
        var socket = this.io(this.config.socketUrl, { query: {client:"vantagejs"}});
        
        socket.on('connect', () => {
            Common.Logger.info('socket connected');
            if (this.ws.hilows) {
                this.emit('hilows', this.ws.hilows);
            }
                   
        });

        return socket;                  
            //});
        //}
        //);

        
    }
}