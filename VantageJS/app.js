"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const VantageWS_1 = require("./VantageWS");
const WebServer_1 = require("./WebServer");
const Common_1 = require("./Common");
var os = require('os');
var config = require('./VantageJS.json');
Common_1.default.init('vantagejs.log');
var comPort = config[os.platform() + '_serialPort'];
let ws = new VantageWS_1.default(comPort, config);
let svr = new WebServer_1.default(config, ws);
svr.start();
ws.onCurrent = current => {
    svr.emit('current', current);
};
ws.onHighLow = hilows => {
    svr.emit('hilows', hilows);
};
ws.onAlert = alerts => {
    svr.emit('alerts', alerts);
};
//ws.onHistory = history => {
//    svr.emit('history', history);
//} 
//# sourceMappingURL=app.js.map