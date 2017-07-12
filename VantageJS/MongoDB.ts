declare function require(name: string); 
var MongoClient = require('mongodb').MongoClient;
import Logger from './Common';

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
                    console.log("Connected successfully to server");
                    this.db = db;     
                    resolve();          
                }
                else {
                    Logger.error(err);
                    reject(err);
                }
            });
        });
        return promise;
    }

    insert(name,obj) {
        var promise = new Promise((resolve, reject) => {
            try {          
                var collection = this.db.collection(name);

                collection.insert(obj , (err,result)=> {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(result.ops[0]);
                    }
                });
            }
            catch(e) {
                Logger.error(e);
                reject(e);
            }
        });
        return promise;
    }
}