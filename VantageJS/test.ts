declare function require(name: string);

import weatherUG from './wunderGround';
import weatherAlert from './weatherAlert';

var config = require('./configuration.json');

var wunderG = new weatherUG(config); 

wunderG.getAlerts().then(alert => {
    console.dir(alert);
});