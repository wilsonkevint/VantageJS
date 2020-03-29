//appCWOP updates CWOP web service by subscribing to socket current and hi/low events
import CWOP from '../VantageLib/CWOP';
import { VPCurrent } from '../VantageLib/VPCurrent';
import * as Common from '../VantageLib/Common';
const moment = require('moment');
import ClientSocket from '../VantageLib/ClientSocket';
import WebRequest from '../VantageLib/WebRequest';
Common.Logger.init('appUpdate.log');
Common.Logger.info('started');

let current: VPCurrent;
const socket = new ClientSocket();

let begin = async () => {

       

    socket.subscribeCurrent((vpcur) => {
        try {
            WebRequest.post('localhost:9000', '/api/vantage/current', vpcur, 20).then(result => {
                console.log('posted ' + result);
            });
        }
        catch (ex) {
            console.log(ex);
        }
    });

    socket.subscribeHiLow((hilows) => {
        try {
            WebRequest.post('localhost:9000', '/api/vantage/hilows', hilows, 20).then(result => {
                console.log('posted ' + result);
            });
        }
        catch (ex) {
            console.log(ex);
        }
    });

    await socket.startAsync(); 

     

};


begin();

// original comment 3.29

