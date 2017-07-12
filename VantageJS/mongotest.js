"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MongoDB_1 = require("./MongoDB");
var config = require('./VantageJS.json');
var db = new MongoDB_1.default(config);
db.connect().then(connected => {
    db.insert('archive', { temperature: 75 }).then(res => {
        console.log(res);
    });
});
//# sourceMappingURL=mongotest.js.map