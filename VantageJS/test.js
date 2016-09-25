"use strict";
var wunderGround_1 = require('./wunderGround');
var config = require('./configuration.json');
var wunderG = new wunderGround_1.default(config);
wunderG.getAlerts().then(function (alert) {
    console.dir(alert);
});
//# sourceMappingURL=test.js.map