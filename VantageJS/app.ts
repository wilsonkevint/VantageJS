
declare function require(name: string);

import VantageWs from './VantageWS';
import VPCurrent from './VPCurrent';
import VPHiLow from './VPHiLow'; 
import WebServer from './WebServer'; 
import Logger from './Common';
var os = require('os'); 
var config = require('./VantageJS.json');
 
Logger.init('vantagejs.log');
var comPort = config[os.platform() + '_serialPort'];

let ws = new VantageWs(comPort, config);
let svr = new WebServer(config,ws); 
svr.start();
 




 









