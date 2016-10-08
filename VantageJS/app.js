"use strict";
const vantageWS_1 = require('./vantageWS');
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
let ws = new vantageWS_1.default(comPort, config);
ws.onCurrent = cur => {
    current = cur;
    io.sockets.emit('current', JSON.stringify(current));
};
ws.onHighLow = hl => {
    hilows = hl;
    io.sockets.emit('hilows', JSON.stringify(hilows));
};
ws.onAlert = alerts => {
    io.sockets.emit('alerts', JSON.stringify(alerts));
};
function requestReceived(req, res) {
    console.log('webRequest ' + moment().format('hh:mm:ss'));
    var allowOrigins = config.allowOrigins[0];
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
        console.log('socket connection');
        if (ws.current)
            socket.emit('current', JSON.stringify(ws.current));
        if (ws.hilows)
            socket.emit('hilows', JSON.stringify(ws.hilows));
        if (ws.alerts)
            socket.emit('alerts', JSON.stringify(ws.alerts));
        socket.on('hilows', function (data) {
            ws.getHiLows();
        });
    });
}
//# sourceMappingURL=app.js.map