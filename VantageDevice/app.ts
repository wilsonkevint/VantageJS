declare function require(name: string);
import Server from './Server';
import DeviceReader from './DeviceReader';
import * as Common from './Common';
const os = require('os');
const config = require('./VantageJS.json');

Common.Logger.init('vantagejs.log'); 

config.comPort = config[os.platform() + '_serialPort'];

let device = new DeviceReader(config);
let server = new Server(config, device);

device.start(); 

server.start();   


