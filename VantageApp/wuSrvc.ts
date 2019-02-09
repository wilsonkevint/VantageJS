import Wunderground from '../VantageLib/Wunderground';
import * as Common from '../VantageLib/Common';
import ClientSocket from './ClientSocket';

let config = require('VantageJS.json');

let wu = new Wunderground(); 

let socket = new ClientSocket();
socket.start(); 

socket.subscribeCurrent((current) => {
    wu.upload(current);
});

setInterval(async () => {
    try {
        let alerts = await wu.getAlerts();
        if (alerts && alerts.length) {
            socket.socketEmit('alerts', alerts);
        }
    }
    catch (err) {
        
    }
},60000*20);
 

