declare function require(name: string);
const process = require('process');
const config = require('./VantageJS.json');
const readline = require('readline');

import * as Common from './Common';
import VantageWs from './VantageWS';
import VPCurrent from './VPCurrent';
import VPHiLow from './VPHiLow';
import WebServer from './WebServer';
import MongoDB from './MongoDB';

Common.Logger.init('vantagejs.log'); 
const vws = new VantageWs(config);
 
vws.init().then(() => {
    if (config.runVWS == "1") {
        vws.start();
    }
});

const svr = new WebServer(config, vws);
svr.start();