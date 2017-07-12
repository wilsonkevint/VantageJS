declare function require(name: string);
import MongoDB from './MongoDB'; 
var config = require('./VantageJS.json');
var db = new MongoDB(config);
db.connect().then(connected=> {
    db.insert('archive',{temperature:75}).then(res=> {
        console.log(res);
    }); 
})