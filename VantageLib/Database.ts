//Database class encapsulates MongoDB methods for reading and updating data
declare function require(name: string); 
const MongoClient = require('mongodb').MongoClient;
import * as Common from './Common';

export default class Database {
    config:any;    
    db:any;
    constructor() {
        this.config = require('./VantageJS.json');
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

    find(collname, criteria) {
        return this.db.collection(collname).find(criteria);
    }

    sort(collname, criteria, sortby) {
        return this.db.collection(collname).find(criteria).sort(sortby);
    }

    async insert(collname,obj) {
        return this.db.collection(collname).insert(obj);
    }

    delete(collname, obj) {
        return this.db.collection(collname).deleteOne(obj);
    }

    sum(collname, fld, criteria, fn) {
        return this.groupSum(collname, fld, '', criteria, fn);
    }

    groupSum(collname, fld, groupBy, criteria, fn, sortOrder?:string) {
        var group = {
            $group: {
                _id: groupBy
            }
        }

        if (Array.isArray(fld)) {
            fld.forEach(f => {
                group.$group[f] = { $sum: '$' + f };
            });
        }
        else {
            group.$group[fld] = { $sum: '$' + fld };
        }

        var so: number;
        if (sortOrder == undefined)
            so = 1;
        else
            so = sortOrder == 'a' ? 1 : -1;

        var sortBy = { $sort: { _id: so } }
        

        return this.db.collection(collname).aggregate([
            { $match: criteria },
            group,
            sortBy
        ], fn)
    }

    update(collname, obj, upsert: boolean) {
        return this.db.collection(collname).update({ _id: obj._id }, obj, {upsert:upsert})
    }

    getLast(collname): any {
        return this.db.collection(collname).find().sort({ "_id": -1 }).limit(1).next();
    }

    getFirst(collname): any {
        return this.db.collection(collname).find().sort({ "_id": 1 }).limit(1).next();
    }

    getLastRecs(collname, recs): any {
        return this.db.collection(collname).find().sort({ "_id": -1 }).limit(recs);
    }
}