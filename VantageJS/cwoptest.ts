declare function require(name: string); 
 
import CWOP from './CWOP';
import WebRequest from './WebRequest';
import VPCurrent from './VPCurrent';
import VPHiLow from './VPHiLow';
var config = require('./VantageJS.json');


WebRequest.get("192.168.7.36:9000", null).then((data) => {
    var cur: VPCurrent = JSON.parse(data);
    var cwop = new CWOP(config);
    cwop.update(cur, new VPHiLow(null)).then(() => {
        console.log('updated');
    }, err => {
        console.log(err);
    })
});

