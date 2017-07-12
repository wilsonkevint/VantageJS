declare function require(name: string);
import Logger from './Common';
var http = require('http');

var server = http.createServer(requestReceived);
var io = require('socket.io')(server);
 
var os = require('os'); 
var config = require('./socketServer.json');
var ws = {hilows:null,current:null,forecast:null,alerts:null};

server.listen(config.webPort);
webSocket();


function requestReceived(req, res) {   
    var allowOrigins = config.allowOrigins[0];
    var postedData = '';
    var origin = req.headers.origin;

    var allowOrigin = config.allowOrigins.filter(function (o) {
        if (o.includes(origin))
            return true;
        else
            return false;
    });

    if (allowOrigin.length)
        allowOrigins = allowOrigin[0];   

    req.on("data", function (data) {
        postedData += data;       
    });
    req.on("end", function () {
        if (req.method == 'POST') {
            try {
                
                var result = JSON.parse(postedData);

                if (req.url.endsWith('current')) {                    
                    ws.current = result;
                    io.emit('current', JSON.stringify(ws.current));
                }

                if (req.url.endsWith('hilows')) {
                    ws.hilows = result;
                    io.emit('hilows', JSON.stringify(ws.hilows));
                }

                if (req.url.endsWith('alerts')) {
                    ws.alerts = result;
                    io.emit('alerts', JSON.stringify(ws.alerts));
                }

               
            }
            catch (e) {
                Logger.info(e)
            }

            res.writeHead(200);
            res.end("");
        }
    });

    if (req.method == 'GET') {
        if (req.url.indexOf('hilows') > -1) {
            if (ws.hilows) {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                res.end(JSON.stringify(ws.hilows));
            }
            else {
                res.writeHead(200);
                res.end("no data");
            }
        }

        if (req.url.indexOf('forecast') > -1) {
            if (ws.forecast) {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                res.end(JSON.stringify(ws.forecast));
            }
            else {
                res.writeHead(200);
                res.end("no data");
            }
        }
        else if (req.url.indexOf('alexa') > -1) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
            try {
                var obj = {
                    humidity: ws.current.humidity.toFixed(0),
                    dewpoint: ws.current.dewpoint.toFixed(0),
                    barometer: ws.current.barometer + ' ' + ws.current.barometerTrend,
                    wind: ws.current.windAvg + ' from ' + ws.current.windDirection,
                    forecast: ws.forecast.periods[0].fcttext,
                    sunrise: ws.current.sunrise,
                    sunset: ws.current.sunset,
                    alerts: ws.alerts.length ? ws.alerts[0].message : 'none'
                }

                obj["inside temperature"] = ws.current.inTemperature.toFixed(0);
                obj["temperature"] = ws.current.temperature.toFixed(0);
                obj["rain rate"] = ws.current.rainRate.toFixed(0);
                obj["rain today"] = ws.current.dayRain.toFixed(0);
                obj["storm rain"] = ws.current.stormRain.toFixed(0);
                obj["month rain"] = ws.current.monthRain.toFixed(0);
                res.end(JSON.stringify(obj));
            }
            catch (ex) {
                res.end("error");
            }



        }
        else {
            if (ws.current) {
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowOrigins });
                res.end(JSON.stringify(ws.current));
            }
            else {
                res.writeHead(200);
                res.end("no data");
            }
        }
    }

}

//socket.io connection
function webSocket() {
    io.on('connection', function (socket) {
        Logger.info('socket connection vp');        

        sendInit(socket);

        socket.on('current', (data) => {
            ws.current = JSON.parse(data);
            Logger.info('current temp:' + ws.current.temperature)
            socket.broadcast.emit('current', data);
           
        });

        socket.on('hilows', (data) => {
            ws.hilows = JSON.parse(data);
            ws.forecast = ws.hilows.forecast
            Logger.info('hilows update');
            //ws.getHiLows();
        });

        socket.on('history', (data) => {
            Logger.info('history request');
            //ws.getArchives();
        });

        socket.on('message',
            (msgtype, msg) => {
                io.sockets.emit('alert', msg);
            });

    });
}

function sendInit(socket) {
    if (ws.current)
        socket.emit('current', JSON.stringify(ws.current));

    if (ws.hilows)
        socket.emit('hilows', JSON.stringify(ws.hilows));

    if (ws.alerts)
        socket.emit('alerts', JSON.stringify(ws.alerts));
}
