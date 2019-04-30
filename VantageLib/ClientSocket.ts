//ClientSocket - listens for web socket events and uses event emitter to fire events in local listeners
declare function require(name: string);
import * as Common from '../VantageLib/Common';
import { EventEmitter } from 'events';
import { setInterval, clearTimeout } from 'timers';
const WebSocket = require('ws');


export default class ClientSocket {
    config: any;
    socket: any;
    eventEmitter: any;
   
    public constructor() {
        this.config = require('./VantageJS.json');       
        this.eventEmitter = new EventEmitter();    
    }

    start() {                 
        this.getSocket();        
    }    

    timer = null;

    getSocket(connectCB = null, errorCB = null) {      
        this.socket = new WebSocket(this.config.socketUrl);

        this.socket.on('connectFailed', function (error) {
            Common.Logger.error('Connect Error: ' + error.toString());
            this.emitEvent('connectFailed',error);
            errorCB && errorCB(error);
        });

        this.socket.on('close', (error) => {
            Common.Logger.error('Connect Closed: ' + error.toString());
            if (!this.timer) {
                this.timer = setTimeout(() => {
                    this.getSocket();
                }, 10000);
            }
        });

        this.socket.on('open', () => {
            console.log('ClientSocket connected');
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            connectCB && connectCB(0);
            this.emitEvent('open', {});            
        });

        var arryjs = ['{', '['];

        this.socket.on('message', data => {         
            if (arryjs.indexOf(data.substr(0, 1)) > -1) {
                let evnt = JSON.parse(data);
                this.emitEvent(evnt.eventName, evnt.eventObject);
            }
        });    

        this.socket.on('error', error => {
            errorCB && errorCB(error);
        });
    }
    
    emitEvent(name: string, obj: any) {
        try {
            this.eventEmitter.emit(name, obj);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

    socketEmit(name: string, obj: any) {
        try {           
            this.socket.emit(name, JSON.stringify(obj));
        }
        catch (e) {
            Common.Logger.error('ClientSocket.emit' + e);
        }
    }

    subscribeCurrent(listener: any) {
        try {
            this.eventEmitter.on('current', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

    subscribeHiLow(listener: any) {
        try {
            this.eventEmitter.on('hilows', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

    subscribeAlert(listener: any) {
        try {
            this.eventEmitter.on('alert', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

    subscribeHistory(listener: any) {
        try {
            this.eventEmitter.on('history', listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }

    subscribe(eventName: string, listener: any ) {
        try {
            this.eventEmitter.on(eventName, listener);
        }
        catch (e) {
            Common.Logger.error(e);
        }
    }
}