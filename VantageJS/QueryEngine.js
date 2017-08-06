"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require('moment');
const MongoDB_1 = require("./MongoDB");
const Common = require("./Common");
class QueryEngine {
    constructor(config, mongo) {
        this.config = config;
        if (mongo != null)
            this.mongo = mongo;
        else {
            this.mongo = new MongoDB_1.default(config);
            this.connect();
        }
    }
    connect() {
        var promise = new Promise((resolve, reject) => {
            if (!this.connected) {
                this.mongo.connect().then(() => {
                    this.connected = true;
                });
            }
            else {
                resolve();
            }
        });
        return promise;
    }
    getRainTotals() {
        var yday = moment().add(-1, 'days').unix();
        console.log(moment.unix(yday));
        var hourAgo = moment().add(-1, 'hour').unix();
        var tot24rain = 0;
        var hourlyrain = 0;
        var promise = new Promise((resolve, reject) => {
            this.connect().then(() => {
                this.mongo.sum('archive', 'rainClicks', { _id: { $gte: yday } }, (err, res) => {
                    if (!err) {
                        tot24rain = res[0].total;
                    }
                    else {
                        Common.Logger.error(err);
                        reject();
                    }
                    this.mongo.sum('archive', 'rainClicks', { _id: { $gte: hourAgo } }, (err, hrly) => {
                        if (!err) {
                            hourlyrain = hrly[0].total;
                            resolve({ last24: tot24rain, hourly: hourlyrain });
                        }
                        else {
                            Common.Logger.error(err);
                            reject();
                        }
                    });
                });
            }, err => {
                Common.Logger.error(err);
            });
        });
        return promise;
    }
}
exports.default = QueryEngine;
//# sourceMappingURL=QueryEngine.js.map