declare function require(name: string);
const moment = require('moment');
const linq = require('linq');
import Database from './Database';
import * as Common from './Common';
import { VPCurrent } from './VPCurrent';

export default class QueryEngine {
    config: any;
    database: Database;
    connected: boolean;

    constructor(database:any=null) {
        this.config = require('./VantageJS.json');
        this.database = database;   
    }    

    connectDB() {
        this.database = new Database();
        return this.database.connect();
    }

    getArchivesDB(startDate,period) {
        var beginDt = moment(startDate, 'MM/DD/YYYY HH:mm').unix();
        var endDt = moment.unix(beginDt).add(1, period).unix();

        var promise = new Promise((resolve, reject) => {
            this.database.find('archive', { _id: { $gte: beginDt, $lt: endDt } }).toArray().then(res => {
                resolve(res);
            });
        });

        return promise;
    }

    getArchivesSum(startDate,period,sortOrder?:string) {
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
        var criteria = { _id: { $gte: beginDt, $lt: endDt }  };
        var group = {
            $group: {
                _id: groupBy,
                rainClicks: { $sum: "$rainClicks" },
                rainRate: { $max: "$rainHiRate" },
                maxTemp: { $max: "$outTemp" },
                minTemp: { $min: "$outTemp" },  
                avgTemp: {$avg: "$outTemp"},
                temperature: { $first: "$outTemp" },    
                humidity: {$max: "$humidity"}
            }
        }             
        

        var so: number;
        if (sortOrder == undefined)
            so = 1;
        else
            so = sortOrder == 'a' ? 1 : -1;

        var sortBy = { $sort: { _id: so } }

        var promise = new Promise((resolve, reject) => {           

            this.database.db.collection('archive').aggregate([
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

                        arch.dewpoint = VPCurrent.fDewpoint(arch.temperature, arch.humidity);                        
                    });
                    resolve(res);
                }
            })
        });

        return promise;
    }

    async getRainTotals(dt):Promise<any> {        
        let yday = moment(dt).add(-1, 'days').unix();     
        let hourAgo = moment(dt).add(-1, 'hour').unix();
        let tot24rain: number = 0;
        let hourlyrain: number = 0;      

        var promise = new Promise<any>((resolve, reject) => {
            try {
                this.database.sum('archive', 'rainClicks', { _id: { $gte: yday } }, (err, res) => {
                    if (!err && res && res.length) {
                        tot24rain = res[0].rainClicks;
                    }
                    else {                      
                        if (err) {
                            reject(err);
                        }
                        tot24rain = 0;
                    }

                    this.database.sum('archive', 'rainClicks', { _id: { $gte: hourAgo } }, (err, hrly) => {
                        if (!err && hrly && hrly.length) {
                            hourlyrain = hrly[0].rainClicks;
                            resolve({ last24: tot24rain, hourly: hourlyrain });
                        }
                        else {
                            if (err) {
                                Common.Logger.error(err);
                            }
                            resolve({ last24: tot24rain, hourly: 0 });
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
            date: key, min: group.min(), max: group.max(),  count: group.count(),avg: group.average()
        }
    }
}