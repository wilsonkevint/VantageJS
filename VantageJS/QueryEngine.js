"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require('moment');
const linq = require('linq');
const Common = require("./Common");
const VPCurrent_1 = require("./VPCurrent");
class QueryEngine {
    constructor(config, mongo) {
        this.config = config;
        this.mongo = mongo;
    }
    getArchivesDB(startDate, period) {
        var beginDt = moment(startDate, 'MM/DD/YYYY HH:mm').unix();
        var endDt = moment.unix(beginDt).add(1, period).unix();
        var promise = new Promise((resolve, reject) => {
            this.mongo.find('archive', { _id: { $gte: beginDt, $lt: endDt } }).toArray().then(res => {
                resolve(res);
            });
        });
        return promise;
    }
    getArchivesSum(startDate, period, sortOrder) {
        var beginDt = moment(startDate, 'MM/DD/YYYY HH:mm').unix();
        var groupBy;
        switch (period) {
            case 'days':
                groupBy = { archiveTime: { $substrBytes: ['$archiveTime', 0, 2] } };
                break;
            case 'months':
                groupBy = { archiveTime: '$archiveDate' };
                beginDt = moment.unix(beginDt).startOf('month').unix();
                break;
            case 'years':
                groupBy = { archiveTime: { $substrBytes: ['$archiveDate', 0, 2] } };
                beginDt = moment.unix(beginDt).startOf('year').unix();
                break;
            default:
                groupBy = { archiveTime: '$archiveTime' };
                break;
        }
        var endDt = moment.unix(beginDt).add(1, period).unix();
        var criteria = { _id: { $gte: beginDt, $lt: endDt } };
        var group = {
            $group: {
                _id: groupBy,
                rainClicks: { $sum: "$rainClicks" },
                rainRate: { $max: "$rainHiRate" },
                maxTemp: { $max: "$outTemp" },
                minTemp: { $min: "$outTemp" },
                avgTemp: { $avg: "$outTemp" },
                temperature: { $first: "$outTemp" },
                humidity: { $max: "$humidity" }
            }
        };
        var so;
        if (sortOrder == undefined)
            so = 1;
        else
            so = sortOrder == 'a' ? 1 : -1;
        var sortBy = { $sort: { _id: so } };
        var promise = new Promise((resolve, reject) => {
            this.mongo.db.collection('archive').aggregate([
                { $match: criteria },
                group,
                sortBy
            ], (err, res) => {
                if (err)
                    reject(err);
                else {
                    res.forEach(arch => {
                        if (arch.temperature != null)
                            arch.temperature = Common.Util.round(arch.temperature, 1);
                        if (arch.maxTemp != null)
                            arch.maxTemp = Common.Util.round(arch.maxTemp, 1);
                        if (arch.minTemp != null)
                            arch.minTemp = Common.Util.round(arch.minTemp, 1);
                        if (arch.avgTemp != null)
                            arch.avgTemp = Common.Util.round(arch.avgTemp, 1);
                        arch.dewpoint = VPCurrent_1.default.fDewpoint(arch.temperature, arch.humidity);
                    });
                    resolve(res);
                }
            });
        });
        return promise;
    }
    getRainTotals(dt) {
        var yday = moment(dt).add(-1, 'days').unix();
        console.log('getRainTotals for ' + dt.toString());
        var hourAgo = moment(dt).add(-1, 'hour').unix();
        var tot24rain = 0;
        var hourlyrain = 0;
        var promise = new Promise((resolve, reject) => {
            try {
                this.mongo.sum('archive', 'rainClicks', { _id: { $gte: yday } }, (err, res) => {
                    if (!err) {
                        tot24rain = res[0].rainClicks;
                    }
                    else {
                        Common.Logger.error(err);
                        reject();
                    }
                    this.mongo.sum('archive', 'rainClicks', { _id: { $gte: hourAgo } }, (err, hrly) => {
                        if (!err) {
                            hourlyrain = hrly[0].rainClicks;
                            resolve({ last24: tot24rain, hourly: hourlyrain });
                        }
                        else {
                            Common.Logger.error(err);
                            reject();
                        }
                    });
                });
            }
            catch (e) {
                Common.Logger.error('getRainTotals ' + e);
                reject(e);
            }
        });
        return promise;
    }
    archiveGroupBy(archives, groupBy, column) {
        return linq.from(archives).groupBy('$.' + groupBy, '$.' + column, this.queryArchives);
    }
    queryArchives(key, group) {
        return {
            date: key, min: group.min(), max: group.max(), count: group.count(), avg: group.average()
        };
    }
}
exports.default = QueryEngine;
//# sourceMappingURL=QueryEngine.js.map