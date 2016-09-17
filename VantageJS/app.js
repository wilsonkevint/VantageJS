"use strict";
var vantageWS_1 = require('./vantageWS');
var moment = require('moment');
var http = require('http');
var server = http.createServer(webRequest);
var io = require('socket.io')(server);
var os = require('os');
var config = require('./configuration.json');
var comPort;
var webPort;
var dataReceived;
var portOpened;
var dataIndx;
var current;
var hilows;
var ctimer;
comPort = config[os.platform() + '_serialPort'];
webPort = config.webPort;
server.listen(webPort);
webSocket();
var ws = new vantageWS_1.default(comPort, config);
ws.onCurrent = function (cur) {
    current = cur;
    io.sockets.emit('current', JSON.stringify(current));
};
ws.onHighLow = function (hl) {
    hilows = hl;
    io.sockets.emit('hilows', JSON.stringify(hilows));
};
function webRequest(req, res) {
    console.log('webRequest ' + moment().format('hh:mm:ss'));
    var allowOrigins = config.allowOrigins[0];
    var referer = req.headers.host.split(':');
    referer = referer[0];
    var origin = config.allowOrigins.filter(function (o) {
        if (o.startsWith(referer))
            return true;
        else
            return false;
    });
    if (origin.length)
        allowOrigins = origin[0];
    console.log(allowOrigins);
    allowOrigins = '*';
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
        socket.on('hilows', function (data) {
            ws.getHiLows();
        });
    });
}
//# sourceMappingURL=app.js.map