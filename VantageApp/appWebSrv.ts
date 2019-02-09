import WebServer from './WebServer';
import ClientSocket from './ClientSocket';
import * as Common from '../VantageLib/Common';
import VPCurrent from '../VantageLib/VPCurrent';
import VPBase from '../VantageLib/VPBase';

let config = require('./VantageJS.json');

let webserver = new WebServer(config);
let socket = new ClientSocket(config);
let vp1Current: VPCurrent;

Common.Logger.init('websrv.log');
socket.start();

socket.subscribeCurrent((current) => {
    webserver.current = typeof (current) == "object" ? current : JSON.parse(current);    
    if (vp1Current && VPBase.timeDiff(vp1Current.dateLoaded, 'm') < 6) {       
        webserver.current.temperature = vp1Current.temperature;
    }
});

socket.subscribeHiLow((hilows) => {
    webserver.hilows = typeof (hilows) == "object" ? hilows : JSON.parse(hilows);
});

socket.subscribe('vp1_current', current => {
    vp1Current = typeof(current) == "object" ? current : JSON.parse(current);
    vp1Current.dateLoaded = new Date(vp1Current.dateLoaded);
    if (webserver.current) {
        webserver.current.temperature = vp1Current.temperature;
    }
});

socket.subscribe('alerts', alerts => {
    webserver.alerts = alerts;
});


webserver.start();

 
