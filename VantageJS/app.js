"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Common = require("./Common");
const VantageWS_1 = require("./VantageWS");
const WebServer_1 = require("./WebServer");
var os = require('os');
var config = require('./VantageJS.json');
Common.Logger.init('vantagejs.log');
var comPort = config[os.platform() + '_serialPort'];
let ws = new VantageWS_1.default(comPort, config);
let svr = new WebServer_1.default(config, ws);
svr.start();
//# sourceMappingURL=app.js.map