import wunderGround from './wunderGround';
declare function require(name: string);

var config = require('./VantageJS.json');
this.config = config;
this.wu = new wunderGround(config);

 
var promise = new Promise( (resolve, reject) => {
    this.wu.getForeCast().then( forecast => {

        resolve(forecast);
    });
}).then(forecast => {
    console.log(forecast);
    });            