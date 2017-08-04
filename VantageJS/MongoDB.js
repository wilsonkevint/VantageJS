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
    find(name, criteria) {
        return this.db.collection(name).find({ "_id": criteria });
    }
    insert(name, obj) {
        return this.db.collection(name).insert(obj);
    }
    sum(name, fld, criteria, fn) {
        return this.db.collection(name).aggregate([
            { $match: criteria },
            {
                $group: {
                    _id: '',
                    total: {
                        $sum: "$rainClicks"
                    }
                }
            }
        ], fn);
    }
    getLast(name) {
        return this.db.collection(name).find().sort({ "_id": -1 }).limit(1).next();
    }
    getLastRecs(name, recs) {
        return this.db.collection(name).find().sort({ "_id": -1 }).limit(recs);
    }
}
exports.default = MongoDB;
//# sourceMappingURL=MongoDB.js.map