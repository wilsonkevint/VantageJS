﻿
declare function require(name: string);

import vantageWS from './vantageWS';
import vpCurrent from './vpCurrent';
import vpHiLow from './vpHiLow';

var moment = require('moment');
var http = require('http');

var server = http.createServer(requestReceived);
var io = require('socket.io')(server);
var os = require('os'); 
var config = require('./VantageJS.json');

var comPort; 
var webPort;
var dataReceived;
var portOpened;
var dataIndx;
var current;
var hilows;
var forecast;
var ctimer;

comPort = config[os.platform() + '_serialPort'];
webPort = config.webPort;

server.listen(webPort);
webSocket();

let ws = new vantageWS(comPort, config);

ws.onCurrent = cur => {
    current = cur;
    io.sockets.emit('current', JSON.stringify(current));
}

ws.onHighLow = hl => {
    hilows = hl;
    io.sockets.emit('hilows', JSON.stringify(hilows));
}
ws.onAlert = alerts => {
    io.sockets.emit('alerts', JSON.stringify(alerts));
}

ws.onHistory = history => {
    io.sockets.emit('history', JSON.stringify(history));
}

 

function requestReceived(req, res) {       
    console.log('webRequest ' + moment().format('hh:mm:ss'));
    var allowOrigins  = config.allowOrigins[0];

    //console.dir(req.headers); 
    var origin = req.headers.origin;    

    var allowOrigin = config.allowOrigins.filter(function (o) {
        if (o.includes(origin))
            return true;
        else
            return false;
    });

    if (allowOrigin.length)
        allowOrigins = allowOrigin[0];

    console.log(allowOrigins);

    //allowOrigins = '*';

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
        if (ws.hilows) {
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
                humidity: ws.current.outHumidity.toFixed(0),
                dewpoint: ws.current.dewpoint.toFixed(0),
                barometer: ws.current.barometer + ' ' + ws.current.barometerTrend,
                wind: ws.current.windAvg + ' from ' + ws.current.windDirection,
                forecast: ws.forecast.periods[0].fcttext,
                sunrise: ws.current.sunrise,
                sunset: ws.current.sunset,
                alerts: ws.alerts.length ? ws.alerts[0].message : 'none'
            }
            obj["inside temperature"] = ws.current.inTemperature.toFixed(0);
            obj["temperature"] = ws.current.outTemperature.toFixed(0);
            obj["rain rate"] = ws.current.rainRate.toFixed(0);
            obj["rain today"] = ws.current.dayRain.toFixed(0);
            obj["storm rain"] = ws.current.stormRain.toFixed(0);
            obj["month rain"] = ws.current.monthRain.toFixed(0);
        }
        catch (ex) {
        }
                 

        res.end(JSON.stringify(obj));
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

//socket.io connection
function webSocket() {
    io.on('connection', function (socket) {
        console.log('socket connection vp');

        if (ws.current)
            socket.emit('current', JSON.stringify(ws.current));

        if (ws.hilows)
            socket.emit('hilows', JSON.stringify(ws.hilows));

        if (ws.alerts)
            socket.emit('alerts', JSON.stringify(ws.alerts));

        socket.on('hilows', (data) => {
            console.log('hilows req');
            ws.getHiLows();
        });   

        socket.on('history', (data) => {
            console.log('history request');
            ws.getArchives();
        });
    });



}








