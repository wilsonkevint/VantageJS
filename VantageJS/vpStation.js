"use strict";
var vantageWS = (function () {
    function vantageWS(comPort) {
        this.station = new vpDevice(comPort);
        var self = this;
        var ctimer;
        this.station.onOpen = function () {
            ctimer = setInterval(function () {
                self.getCurrent();
            }, frequency);
            self.getCurrent();
        };
    }
    vantageWS.prototype.getLoops = function () {
        var self = this;
        this.station.wakeUp().then(function (result) {
            self.station.readLoop(10, function (data) {
                if (vpDevice.validateCRC(data)) {
                    console.log('loop');
                    self.current = new vpCurrent(data);
                    self.updateWU(self.current);
                }
            });
        });
    };
    vantageWS.prototype.getCurrent = function () {
        var self = this;
        if (self.pauseLoop) {
            var enddt = moment();
            var duration = moment.duration(enddt.diff(self.pauseLoop));
            if (duration.asSeconds() > pauseSecs) {
                self.pauseLoop = null;
            }
            else {
                return;
            }
        }
        this.station.wakeUp().then(function (result) {
            self.station.getData("LOOP 1", 99).then(function (data) {
                if (vpDevice.validateCRC(data)) {
                    self.current = new vpCurrent(data);
                    self.updateWU(self.current);
                    io.sockets.emit('current', JSON.stringify(self.current));
                }
            }, VantageWS.deviceError);
        }, VantageWS.deviceError);
    };
    vantageWS.prototype.getHiLows = function () {
        this.pauseLoop = moment();
        var self = this;
        this.station.wakeUp().then(function (result) {
            self.station.getData("HILOWS", 438).then(function (data) {
                if (vpDevice.validateCRC(data)) {
                    var hilows = new vpHiLow(data);
                    hilows.dateLoaded = moment().format('YYYY-MM-DD hh:mm:ss');
                }
            });
        });
    };
    vantageWS.deviceError = function (err) {
        console.log(err);
    };
    vantageWS.prototype.updateWU = function (current) {
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
        //rl.on('line', (input) => {
        //console.log(`Received: ${input}` + input.length);
        //  if (input.length == 0)
        //	myPort.write('\n'); 
        //  else
        //	myPort.write(input); 
        //});
    };
    return vantageWS;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = vantageWS;
//# sourceMappingURL=vpStation.js.map