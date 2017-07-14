declare function require(name: string);
var moment = require('moment');
import MongoDB from './MongoDB'; 
var config = require('./VantageJS.json');
var mongo = new MongoDB(config);
mongo.connect().then(connected=> {
    var db = mongo.db;
    //db.collection('archive').deleteMany({});
    //console.log(db.version());
    var cmd = db.collection('archive').find().sort({ "_id": -1 }).limit(1).next();
    
    cmd.then(res => {
        console.log(res);
    })
    //db.collection('archive').find().sort({ _id: -1 }).then(archive => {
    //    var dt = moment.unix(archive._id);
    //    console.log(dt.format('MM/DD/YYYY HH:mm'));
    //}, err => {
    //    console.log(err);
    //})
    //db.insert('archive',{temperature:75}).then(res=> {
    //    console.log(res);
    //}); 
})