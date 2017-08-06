declare function require(name: string); 
var MongoClient = require('mongodb').MongoClient;
import * as Common from './Common';

export default class MongoDB {
    config:any;    
    db:any;
    constructor(config) {
        this.config = config;
    }

    connect() {
        var url = this.config['MongoDBServer'];
        var promise = new Promise((resolve, reject) => {
            MongoClient.connect(url, (err, db) => {    
                if (!err) {
                    console.log("Connected successfully to mongodb");
                    this.db = db;     
                    resolve();          
                }
                else {
                    Common.Logger.error(err);
                    reject(err);
                }
            });
        });
        return promise;
    }

    find(name, criteria) {
        return this.db.collection(name).find(criteria).next();
    }

    sort(name, criteria, sortby) {
        return this.db.collection(name).find(criteria).sort(sortby);
    }

    insert(name,obj) {
        return this.db.collection(name).insert(obj);
    }

    sum(name, fld, criteria, fn) {
        return this.db.collection(name).aggregate([
            {$match: criteria},
            {      
                $group: {
                    _id: '',
                    total: {
                        $sum: "$rainClicks"
                    }
                }
            }
        ],fn)
    }

    update(name, obj, upsert: boolean) {
        return this.db.collection(name).update({ _id: obj._id }, obj, {upsert:upsert})
    }

    getLast(name): any {
        return this.db.collection(name).find().sort({ "_id": -1 }).limit(1).next();
    }

    getLastRecs(name, recs): any {
        return this.db.collection(name).find().sort({ "_id": -1 }).limit(recs);
    }
}