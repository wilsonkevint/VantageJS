"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MongoClient = require('mongodb').MongoClient;
const Common = require("./Common");
class MongoDB {
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
    find(collname, criteria) {
        return this.db.collection(collname).find(criteria);
    }
    sort(collname, criteria, sortby) {
        return this.db.collection(collname).find(criteria).sort(sortby);
    }
    insert(collname, obj) {
        return this.db.collection(collname).insert(obj);
    }
    delete(collname, obj) {
        return this.db.collection(collname).deleteOne(obj);
    }
    sum(collname, fld, criteria, fn) {
        return this.groupSum(collname, fld, '', criteria, fn);
    }
    groupSum(collname, fld, groupBy, criteria, fn, sortOrder) {
        var group = {
            $group: {
                _id: groupBy
            }
        };
        if (Array.isArray(fld)) {
            fld.forEach(f => {
                group.$group[f] = { $sum: '$' + f };
            });
        }
        else {
            group.$group[fld] = { $sum: '$' + fld };
        }
        var so;
        if (sortOrder == undefined)
            so = 1;
        else
            so = sortOrder == 'a' ? 1 : -1;
        var sortBy = { $sort: { _id: so } };
        return this.db.collection(collname).aggregate([
            { $match: criteria },
            group,
            sortBy
        ], fn);
    }
    update(collname, obj, upsert) {
        return this.db.collection(collname).update({ _id: obj._id }, obj, { upsert: upsert });
    }
    getLast(collname) {
        return this.db.collection(collname).find().sort({ "_id": -1 }).limit(1).next();
    }
    getFirst(collname) {
        return this.db.collection(collname).find().sort({ "_id": 1 }).limit(1).next();
    }
    getLastRecs(collname, recs) {
        return this.db.collection(collname).find().sort({ "_id": -1 }).limit(recs);
    }
}
exports.default = MongoDB;
//# sourceMappingURL=MongoDB.js.map