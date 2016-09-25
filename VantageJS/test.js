"use strict";
var weatherUG_1 = require('./weatherUG');
var config = require('./configuration.json');
var wunderG = new weatherUG_1.default();
wunderG.getAlerts(config).then(function (alert) {
    console.dir(alert);
});
//# sourceMappingURL=test.js.map