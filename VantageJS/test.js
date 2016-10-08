"use strict";
const wunderGround_1 = require('./wunderGround');
var config = require('./VantageJS.json');
this.config = config;
this.wu = new wunderGround_1.default(config);
var self = this;
var promise = new Promise(function (resolve, reject) {
    self.wu.getForeCast().then(function (forecast) {
        resolve(forecast);
    });
}).then(forecast => {
    console.log(forecast);
});
//# sourceMappingURL=test.js.map