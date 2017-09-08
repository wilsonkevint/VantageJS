"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process = require('process');
const config = require('./VantageJS.json');
const readline = require('readline');
//const moment = require('moment');
const Common = require("./Common");
const VantageWS_1 = require("./VantageWS");
const WebServer_1 = require("./WebServer");
const vws = new VantageWS_1.default(config);
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
Common.Logger.init('vantagejs.log');
vws.init().then(() => {
    //var ts = VPDevice.getArchiveTS("09/07/2017 08:15");
    if (config.runVWS == "1") {
        vws.start();
    }
    //vws.queryEngine.getRainTotals(moment('09/07/2017', 'MM/DD/YYYY')).then(rain => {
    //    console.log(rain);
    //});
}, err => Common.Logger.error('.init', err));
const svr = new WebServer_1.default(config, vws);
svr.start();
rl.question('', reply => {
    if (reply == 'quit') {
        vws.stop();
        console.log('stopping');
        setTimeout(() => {
            process.exit(0);
        }, 5000);
    }
});
//# sourceMappingURL=app.js.map