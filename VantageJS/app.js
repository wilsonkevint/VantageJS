"use strict";
var vpDevice_1 = require('./vpDevice');
var vpCurrent_1 = require('./vpCurrent');
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
var frequency = 5000;
var current;
var ctimer;
var VantageWS = (function () {
    function VantageWS(comPort) {
        this.station = new vpDevice_1.default(comPort);
        var self = this;
        var ctimer;
        this.station.onOpen = function () {
            ctimer = setInterval(function () {
                self.getCurrent();
            }, frequency);
            self.getCurrent();
        };
    }
    VantageWS.prototype.getLoops = function () {
        var self = this;
        this.station.wakeUp().then(function (result) {
            self.station.readLoop(10, function (data) {
                if (vpDevice_1.default.validateCRC(data)) {
                    console.log('loop');
                    self.current = new vpCurrent_1.default(data);
                    self.updateWU(self.current);
                }
            });
        });
    };
    VantageWS.prototype.getCurrent = function () {
        var self = this;
        this.station.wakeUp().then(function (result) {
            self.station.getData("LOOP 1", 99).then(function (data) {
                if (vpDevice_1.default.validateCRC(data)) {
                    self.current = new vpCurrent_1.default(data);
                    self.updateWU(self.current);
                    io.sockets.emit('current', JSON.stringify(self.current));
                }
            }, VantageWS.deviceError);
        }, VantageWS.deviceError);
    };
    VantageWS.deviceError = function (err) {
        console.log(err);
    };
    VantageWS.prototype.updateWU = function (current) {
        var path = '/weatherstation/updateweatherstation.php?ID=KOHAkron2&PASSWORD=1n5Kvp%f&dateutc=' + moment().utc().format('YYYY-MM-DD HH:mm:ss').replace(' ', '%20')
            + '&winddir=' + current.windDir + '&windspeedmph=' + current.windAvg
            + '&windgustmph=' + current.windSpeed + '&tempf=' + current.outTemperature
            + '&rainin=' + current.rainRate + '&dailyrainin=' + current.dayRain + '&baromin=' + current.barometer
            + '&humidity=' + current.outHumidity + '&dewptf=' + current.dewpoint
            + '&weather=&clouds='
            + '&softwaretype=custom&action=updateraw';
        var options = {
            host: 'weatherstation.wunderground.com',
            port: 80,
            path: path,
            method: 'get',
            timeout: 4000
        };
        try {
            var request = http.request(options, function (response) {
                response.on('data', function (chunk) {
                    console.log('update WU: ' + String.fromCharCode.apply(null, chunk) + moment().format('hh:mm:ss') + ' temp:' + current.outTemperature);
                });
                response.on('timeout', function (socket) {
                    console.log('resp timeout');
                });
                response.on('error', function (err) {
                    console.log('resp error' + err);
                });
            });
            request.on('error', function (err) {
                console.log('request error ' + err);
            });
            request.setTimeout(30000, function () {
                console.log('request timeout');
            });
            request.end();
        }
        catch (ex) {
            console.log('updateWU exception');
            console.log(ex);
        }
        //function getHiLows() {
        //    return getData('HILOWS', 438).then(function (data) {
        //        if (validateCRC(data)) {
        //            hiLows = processHiLows(data);
        //        }
        //    });
        //}
        //processHiLows(data) {
        //}
        //rl.on('line', (input) => {
        //console.log(`Received: ${input}` + input.length);
        //  if (input.length == 0)
        //	myPort.write('\n'); 
        //  else
        //	myPort.write(input); 
        //});
    };
    return VantageWS;
}());
var ws = new VantageWS(comPort);
server.listen(webPort);
webSocket();
//web server
function webRequest(req, res) {
    console.log('webRequest ' + moment().format('hh:mm:ss'));
    if (ws.current) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(ws.current));
    }
    else {
        res.writeHead(200);
        res.end("no data");
    }
}
//socket.io connection
function webSocket() {
    io.on('connection', function (socket) {
        console.log('socket connection');
        socket.emit('current', JSON.stringify(ws.current));
        socket.on('my other event', function (data) {
            console.log(data);
        });
    });
}
//# sourceMappingURL=app.js.map