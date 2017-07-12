"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MongoClient = require('mongodb').MongoClient;
const Common_1 = require("./Common");
class MongoDB {
    constructor(config) {
        this.config = config;
    }
    connect() {
        var url = this.config['MongoDBServer'];
        var promise = new Promise((resolve, reject) => {
            MongoClient.connect(url, (err, db) => {
                if (!err) {
                    console.log("Connected successfully to server");
                    this.db = db;
                    resolve();
                }
                else {
                    Common_1.default.error(err);
                    reject(err);
                }
            });
        });
        return promise;
    }
    insert(name, obj) {
        var promise = new Promise((resolve, reject) => {
            try {
                var collection = this.db.collection(name);
                collection.insert(obj, (err, result) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result.ops[0]);
                    }
                });
            }
            catch (e) {
                Common_1.default.error(e);
                reject(e);
            }
        });
        return promise;
    }
}
exports.default = MongoDB;
//# sourceMappingURL=MongoDB.js.map