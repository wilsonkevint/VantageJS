declare function require(name: string);
import VPCurrent from './VPCurrent';
var moment = require('moment');

var io = require('socket.io-client');
var wsocket = io('http://hpmini-srvr:9000');
var current: VPCurrent;

wsocket.on('current', data => {
    current = JSON.parse(data);
   
});

setInterval(() => {
    
    if (current != null) {
        var loaded = moment(current.dateLoaded,"YYYY-MM-DD HH:mm:ss");
        var now = moment(new Date());
        var duration = moment.duration(now.diff(loaded));

        if (duration.asMinutes() >= 5) {
           
            var msg = {
                name: 'VP',
                alert: 'VP current last updated ' + loaded.format('MM/DD/YYYY HH:mm:ss')
            }
            console.log(msg.alert);
            wsocket.send('alert', JSON.stringify(msg))
        }  


       
    }
}, 1000*60*5);