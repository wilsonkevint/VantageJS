declare function require(name: string); 
var net = require('net');
var moment = require('moment');
import WebRequest from './WebRequest';
import VPCurrent from './VPCurrent';
import MongoDB from './MongoDB';
var config = require('./VantageJS.json');
var mongo = new MongoDB(config);

var client = new net.Socket();
var loggedIn = 0;
var userId = 'FW1403'
var longitude = '08134.41W';
var latitude = '4108.96N';

var rain = 0;
var now = moment();
var yday = now.add(-30, 'days').unix(); 

mongo.connect().then(() => {
    var csr = mongo.sum('archive', 'rainClicks', { _id: { $gte: yday } }, (err,res) => {
        console.log(res);
    })
});   


WebRequest.get("192.168.7.36:9000", null).then((data) => {
    var cur: VPCurrent = JSON.parse(data);
    client.connect(14580, 'cwop.aprs.net', function () {
        console.log('Connected');        
    });

    client.on('data', function (data) {
        var resp = String.fromCharCode.apply(null, data);
        console.log('Received: ' + resp);
        var timeStr = moment.utc().format('DDHHmm');

        if (resp.indexOf('logresp') > -1) {
            loggedIn = 1;
            var baromb = cur.barometer * 33.8637526 * 10;
            var humidity = cur.humidity == 100 ? 0 : cur.humidity;
            cur.hourlyRain = rain;

            var updateStr = userId + '>APRS,TCPIP*:@' + timeStr + 'z' + latitude + '/' + longitude + '_' + formatNum(cur.windDir, 3)
                + '/' + formatNum(cur.windAvg, 3) + 'g' + formatNum(cur.windSpeed, 3) + 't' + formatNum(cur.temperature, 3) + 'r' + formatNum(cur.hourlyRain, 3)
                + 'p...' + 'P' + formatNum(cur.dayRain * 100, 3) + 'b' + formatNum(baromb, 5) + 'h' + formatNum(humidity, 2);
            console.log(updateStr);
            client.write(updateStr + '\n\r');         
            client.destroy();
        }

        if (!loggedIn) {
            client.write('user ' + userId + ' pass -1 vers VantageJS 1.0\r\n');           
        }
       
    });

    client.on('close', function () {
        console.log('Connection closed');
    });

    
});


function formatNum(num, len) {
    return padZero(round(num, 0), len);
}

function padZero(num:number,len:number) {
    if (num.toString().length >= len) return num;
    return (Math.pow(10, len) + Math.floor(num)).toString().substring(1);
}

function round(nbr, decimals) {
    if (typeof nbr == 'string') {
        nbr = parseFloat(nbr);
    }
    if (!decimals) {
        decimals = 0;
    }

    return parseFloat(nbr.toFixed(decimals));
}


