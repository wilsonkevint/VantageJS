"use strict";
var vantageWS_1 = require('./vantageWS');
var moment = require('moment');
var http = require('http');
var server = http.createServer(webRequest);
var io = require('socket.io')(server);
var os = require('os');
var comPort = os.platform() == 'win32' ? 'COM3' : '/dev/ttyUSB0';
var webPort = '9000';
var dataReceived;
var portOpened;
var dataIndx;
var updateFreqMS = 5000;
var current;
var hilows;
var ctimer;
server.listen(webPort);
webSocket();
var ws = new vantageWS_1.default(comPort, updateFreqMS);
ws.onCurrent = function (cur) {
    current = cur;
    io.sockets.emit('current', JSON.stringify(current));
};
ws.onHighLow = function (hl) {
    hilows = hl;
    io.sockets.emit('hilows', JSON.stringify(hilows));
};
console.log(os.platform());
function webRequest(req, res) {
    console.log('webRequest ' + moment().format('hh:mm:ss'));
    if (req.url.indexOf('hilows') > -1) {
        if (ws.hilows) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(ws.hilows));
        }
        else {
            res.writeHead(200);
            res.end("no data");
        }
    }
    else {
        if (ws.current) {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
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
        socket.on('hilows', function (data) {
            ws.getHiLows();
        });
    });
}
//# sourceMappingURL=app.js.map