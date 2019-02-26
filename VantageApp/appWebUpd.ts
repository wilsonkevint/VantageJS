//appWebUpd - updates Weather Underground site by subscribing to current and hi/low events from web socket
import Wunderground from '../VantageLib/Wunderground';
import * as Common from '../VantageLib/Common';
import ClientSocket from '../VantageLib/ClientSocket';
import WeatherAlert from '../VantageLib/WeatherAlert';
Common.Logger.init('wu.log');
Common.Logger.info('started');



let socket = new ClientSocket();
let wu = new Wunderground(socket); 

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
        if (!alerts || !alerts.length) {
            alerts = new Array<WeatherAlert>(); 
        }
        socket.socketEmit('alerts', alerts);
    }
    catch (err) {
        
    }
},60000*20);
 

