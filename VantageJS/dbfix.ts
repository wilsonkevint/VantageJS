
declare function require(name: string);
import MongoDB from './MongoDB';
import QueryEngine from './QueryEngine';
const readline = require('readline');
const config = require('./VantageJS.json');
const mongo = new MongoDB(config);
const process = require('process'); 
const moment = require('moment');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let archives = null;
let updated =0;

mongo.connect().then(() => {
    let queryEngine = new QueryEngine(this.config, this.mongo);
    let startDate = '07/15/2018';
    let endDate = '12/14/2018';
    
    let beginDt = moment(startDate, 'MM/DD/YYYY HH:mm').unix();
    var endDt = moment(endDate, 'MM/DD/YYYY HH:mm').unix();    
 

    mongo.db.collection('archive').find().toArray().then(res => {
        console.log('cnt:' + res.length);
        let idx = 0;
        archives = res;
        update(idx);             
    });    

});

function update(idx) {
     var rec = archives[idx];
     var arDt = moment(rec._id * 1000).startOf('day').format('MM/DD/YYYY'); 
     var upd = {$set:{archiveDate:arDt}};
     mongo.db.collection('archive').update({ _id: rec._id }, upd, {upsert:true}).then(()=> {
       
        idx++;
        if (idx >= archives.length) {
             console.log('updated ' + updated);             
        }
        else {
             updated++;
            update(idx);
        }
     });
}

rl.question('', reply => {
    if (reply == 'quit') {
        process.exit(0);
       
    }
});