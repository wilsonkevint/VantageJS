
declare function require(name: string);

import * as Common from './Common';
import VantageWs from './VantageWS';
import VPCurrent from './VPCurrent';
import VPHiLow from './VPHiLow'; 
import WebServer from './WebServer';
import MongoDB from './MongoDB';
const config = require('./VantageJS.json');
 
Common.Logger.init('vantagejs.log'); 
const vws = new VantageWs(config);
vws.init(() => {    
    vws.updateArchives().then(() => {
        vws.updateFromArchive().then(() => {
           vws.start();
        });

    });
   
});



const svr = new WebServer(config,vws); 
svr.start();
 




 









