"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require('moment');
const MongoDB_1 = require("./MongoDB");
var config = require('./VantageJS.json');
var mongo = new MongoDB_1.default(config);
const QueryEngine_1 = require("./QueryEngine");
mongo.connect().then(connected => {
    var db = mongo.db;
    //db.collection('archive').deleteMany({});
    //console.log(db.version());
    var archive = db.collection('archive');
    //var cmd = archive.find({ rainClicks: {$gt:0}});
    var query = new QueryEngine_1.default(config, mongo);
    query.getRain().then(result => {
        console.log(result);
    });
    //cmd.forEach(rec => {
    //console.log(rec.rainClicks, rec.archiveDate + ' ' + rec.archiveTime);
    //if (rec.rainClicks > 1) {
    //    rec.rainClicks = rec.rainClicks / 10;
    //    archive.update({ _id: rec._id }, rec);
    //}
    //})
    //db.collection('archive').find().sort({ _id: -1 }).then(archive => {
    //    var dt = moment.unix(archive._id);
    //    console.log(dt.format('MM/DD/YYYY HH:mm'));
    //}, err => {
    //    console.log(err);
    //})
    //db.insert('archive',{temperature:75}).then(res=> {
    //    console.log(res);
    //}); 
});
//# sourceMappingURL=mongotest.js.map