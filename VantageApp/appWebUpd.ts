import Wunderground from '../VantageLib/Wunderground';
import * as Common from '../VantageLib/Common';
import ClientSocket from '../VantageLib/ClientSocket';
Common.Logger.init('wu.log');
Common.Logger.info('started');

let wu = new Wunderground(); 

let socket = new ClientSocket();

wu.database.connect().then(() => {
    socket.start();

    socket.subscribeCurrent((current) => {
        wu.upload(current);
    });

    socket.subscribeHiLow(async (hilow) => {
        try {
            await wu.updateFromArchive();
        }
        catch (err) {
            Common.Logger.error(err);
            socket.socketEmit('error', 'wuArchive:' + err);
        }
    });

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
 

