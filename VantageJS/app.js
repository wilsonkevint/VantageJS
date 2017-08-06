"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Common = require("./Common");
const VantageWS_1 = require("./VantageWS");
const WebServer_1 = require("./WebServer");
const config = require('./VantageJS.json');
Common.Logger.init('vantagejs.log');
const vws = new VantageWS_1.default(config);
vws.init(() => {
    vws.updateArchives().then(() => {
        vws.updateFromArchive().then(() => {
            vws.start();
        });
    });
});
const svr = new WebServer_1.default(config, vws);
svr.start();
//# sourceMappingURL=app.js.map