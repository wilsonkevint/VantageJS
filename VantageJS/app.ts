
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

const vws = new VantageWs(config);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

Common.Logger.init('vantagejs.log'); 

vws.init().then(() => {    
    if (config.runVWS == "1" ) {
        vws.start();
    }
});

const svr = new WebServer(config,vws); 
svr.start();

rl.question('', reply => {
    if (reply == 'quit') {
        vws.stop();
        console.log('stopping');
        setTimeout(() => {
            process.exit(0);
        },5000)
    }
});
 




 









