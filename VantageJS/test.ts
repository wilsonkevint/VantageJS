declare function require(name: string);

import weatherUG from './weatherUG';
import weatherAlert from './weatherAlert';

var config = require('./configuration.json');

var wunderG = new weatherUG(); 

wunderG.getAlerts(config).then(alert => {
    console.dir(alert);
});