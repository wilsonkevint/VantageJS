declare function require(name: string);
const process = require('process');
const config = require('./VantageJS.json');
const http = require('http');
const readline = require('readline');
import VPCurrent from './VPCurrent';
import VPDevice from './VPDevice';
import VPHiLow from './VPHiLow';
import VPBase from './VPBase'; 
import * as Common from './Common';
import ClientSocket from './ClientSocket';
import { EventEmitter } from 'events';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

Common.Logger.init('vantagejs.log'); 

const vp = new VPDevice(config.linux_serialPort);
const eventEmitter = new EventEmitter(); 
let lastHiLows = null;
let lastCurrent = null;
let current: VPCurrent;
var clientSocket: ClientSocket;

vp.onOpen = () => {
    clientSocket = new ClientSocket(config,'vp1');
    clientSocket.start();

    let server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify(current));
    });

    server.listen(9000);

    setTimeout(() => {
        getCurrent();        
    }, 3000);

    setInterval(() => {
        getCurrent();

        if (lastHiLows == null || VPBase.timeDiff(lastHiLows, 'm') >= config.hilowInterval) {
            getHiLows();
        }

    }, config.loopInterval)
}

 

 

function getCurrent() {
    console.log('getCurrent');
    
    vp.wakeUp().then(result => {
        console.log('waked');
        vp.getSerial('LOOP 1',99,true).then(data => {
            console.log('received:' + data.length);
            current = parseCurrent(data);
            if (current && current.temperature != null && current.temperature < 120 && current.temperature > -50) {
                console.log('temp: ' + current.temperature);
                clientSocket.socketEmit('vp1_current', current);               
                lastCurrent = new Date();
            }
            else {
                console.log('current not parsed');
            }

        });
    }, err => { console.log('wake up:' + err); });

}

function getHiLows() {
    
    vp.wakeUp().then(result => {
        vp.getSerial("HILOWS", 438, true).then(data => {
            if (VPDevice.validateCRC(data, 0)) {                     
                var hilows = new VPHiLow(data);      
                console.log('got hilows: ', hilows.temperature.dailyHi);
                clientSocket.socketEmit('vp1_hilows', hilows);
                lastHiLows = new Date();
            }
        }, deviceError);
    }, deviceError);
    
}

function parseCurrent(data): VPCurrent {    
    var current=null; 
    var startx = data.length == 99 ? 0 : 1;
   
    if (VPDevice.validateCRC(data, startx)) {
        current = new VPCurrent(data);
    }
    else {
        console.log('crc error');
    }

    return current;
}

function setTime() {
    var data = [6];
    var now = new Date();
    data[0] = now.getSeconds();
    data[1] = now.getMinutes();
    data[2] = now.getHours();
    data[3] = now.getDate();
    data[4] = now.getMonth() + 1;
    data[5] = now.getFullYear() - 1900;
    var crc = VPDevice.getCRC(data);
    Array.prototype.push.apply(data, crc);

    vp.wakeUp().then(result => {
        console.log('setting time');

        vp.getSerial("SETTIME" + '\n', 1, false).then(data => {           

            vp.getSerial(data, 1, true).then(res => {
                if (res[0] == 6) {
                    console.log('time successfully changed');
                }
                else
                    console.log('settime error, no ack');
            }, deviceError);
        }, err => {
            console.log('setTime error:' + err);
        })
    }, err => {
        console.log('setTime no wake:' + err);
    });
     
}

function deviceError(err) {
    console.log(err);
}

rl.question('', reply => {
    if (reply == 'quit') {       
        console.log('stopping');
        setTimeout(() => {
            process.exit(0);
        }, 2000)
    }
});

