//appCWOP updates CWOP web service by subscribing to socket current and hi/low events
import CWOP from '../VantageLib/CWOP';
import { VPCurrent } from '../VantageLib/VPCurrent';
import * as Common from '../VantageLib/Common';
const moment = require('moment');
import ClientSocket from '../VantageLib/ClientSocket';
import { VPBase } from '../VantageLib/VPBase';

Common.Logger.init('cwop.log');
Common.Logger.info('started');  
 
const socket = new ClientSocket(); 
const cwop = new CWOP(socket);
let current: VPCurrent;

let begin = async () => {

    await socket.startAsync();

    socket.subscribeCurrent((vpcur) => {
        current = vpcur;
    });

    socket.subscribeHiLow(async (evnt) => {
        try {
            let curr = evnt.current ? evnt.current : current;
            if (curr && evnt.hiLows) {
                var hilows = evnt.hiLows;
                let rain = await cwop.queryEngine.getRainTotals(moment());
                hilows.rain24hour = rain.last24;
                hilows.rain1hour = rain.hourly;
                await cwop.update(curr, hilows);
            }
        }
        catch (err) {
            Common.Logger.error(err);
            socket.socketEmit('error', 'cwop:' + err);
        }
    });     
    
    await cwop.queryEngine.connectDB(); 
  
    await cwop.updateFromArchive();  

    setInterval(() => {
        if (VPBase.timeDiff(current.dateLoaded, 'm') > 5) {
            socket.reconnect();
        }
    }, 60000 * 10);

    
};


begin();


 // original comment 3.29
 //comment 
 //comment 3/29
 
 