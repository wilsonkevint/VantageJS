"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CWOP_1 = require("./CWOP");
const WebRequest_1 = require("./WebRequest");
const VPHiLow_1 = require("./VPHiLow");
var config = require('./VantageJS.json');
WebRequest_1.default.get("192.168.7.36:9000", null).then((data) => {
    var cur = JSON.parse(data);
    var cwop = new CWOP_1.default(config);
    cwop.update(cur, new VPHiLow_1.default(null)).then(() => {
        console.log('updated');
    }, err => {
        console.log(err);
    });
});
//# sourceMappingURL=cwoptest.js.map