import wunderGround from './wunderGround';
declare function require(name: string);

var config = require('./VantageJS.json');
this.config = config;
this.wu = new wunderGround(config);

var self = this;
var promise = new Promise(function (resolve, reject) {
    self.wu.getForeCast().then(function (forecast) {

        resolve(forecast);
    });
}).then(forecast => {
    console.log(forecast);
    });            