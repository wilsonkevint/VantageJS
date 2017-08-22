"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require('moment');
var process = require('process');
const MongoDB_1 = require("./MongoDB");
const QueryEngine_1 = require("./QueryEngine");
const WebRequest_1 = require("./WebRequest");
var config = require('./VantageJS.json');
//Common.Util.updateFromArchive(config);
var mongo = new MongoDB_1.default(config);
mongo.connect().then(() => {
    var query = new QueryEngine_1.default(config, mongo);
    //var dt = moment();
    //query.getRainTotals(dt).then(rain => {
    //    console.log(rain);
    //});
    var downloadUrl = 'www.wunderground.com:443/weatherstation/WXDailyHistory.asp?ID=KOHAKRON2&day=${day}&month=${month}&year=2017&graphspan=day&format=1';
    var inserted = 0;
    var beginDt = moment('01/01/2017', 'MM/DD/YYYY');
    var endDt = moment('06/08/2017 16:00', 'MM/DD/YYYY HH:mm');
    var updated = 0;
    updateArchive(beginDt);
    //convert string to numbers
    //mongo.find('archive', { _id: { $gte: beginDt, $lt: endDt } }).toArray().then(archives => {
    //    archives.forEach((archive: VPArchive) => {
    //        if (typeof archive.outTemp == 'string') {                
    //            archive.outTemp = Number(archive.outTemp);
    //            archive.outTempHi = Number(archive.outTempHi);
    //            archive.outTempLow = Number(archive.outTempLow);
    //            archive.humidity = Number(archive.humidity);
    //            archive.rainClicks = Number(archive.rainClicks);
    //            archive.rainHiRate = Number(archive.rainHiRate);
    //            archive.windAvg = Number(archive.windAvg);
    //            archive.inTemp = isNaN(archive.inTemp) ? 0 : archive.inTemp;
    //            mongo.update('archive', archive, false).then(() => {
    //                updated++;
    //            }, err => {
    //                console.log(err)
    //            })
    //        }
    //    });
    //    //process.exit(0);
    //});
    //query.getArchivesDB(beginDt, 'months').then((archives:Array<any>) => {
    //var last = archives[archives.length - 1];
    //beginDt = moment(last.archiveDate + ' ' + last.archiveTime, 'MM/DD/YYYY HH:mm').add(5, 'minutes');
    //updateArchive(beginDt);
    //var timer = setInterval(() => {
    //    updateArchive(dt);
    //    console.log('inserted ' + inserted);
    //    dt = dt.add(1, 'days');
    //    if (dt.unix() >= endDt.unix()) {
    //        clearInterval(timer);
    //    }
    //}, 5000);
    //})
    //query.getArchivesDB(dt).then((archives:any) => {
    //    var total = 0;
    //    archives.forEach(arch => {
    //        total += arch.rainClicks / 100;
    //    })
    //});
    //var dtUnix = moment(dt, 'MM/DD/YYYY').unix();
    //mongo.groupSum('archive', ['rainClicks'], { hour: { $substrBytes: ['$archiveTime', 0, 2] } }, { _id: { $gte: dtUnix } }, (err, res) => {
    //    console.log(res);
    //},'d')
    //query.getArchivesSum('01/01/2017', 'years').then(result => {
    //    console.log(result);
    //});
    function updateArchive(dt) {
        var day = dt.date();
        var month = dt.month() + 1;
        var url = eval('`' + downloadUrl + '`');
        var hdr = [];
        WebRequest_1.default.get(url, null).then(data => {
            var rows = data.split('\n');
            console.log(dt.toString() + ' found ' + rows.length + ' rows');
            var lastRain = 0;
            var lastUpdate = null;
            var index = 0;
            var dayRain = null;
            while (index < rows.length) {
                let row = rows[index];
                if (row == '' || row == '<br>') {
                    rows.splice(index, 1);
                }
                else
                    index++;
            }
            var row = rows[0];
            hdr = [];
            var cols = row.split(',');
            cols.forEach(col => {
                hdr.push(col);
            });
            row = null;
            rows.splice(0, 1);
            dayRain = rows[0].split(',')[6];
            rows.reverse();
            var tmr = setInterval(() => {
                if (!row) {
                    row = rows.pop();
                    cols = row.split(',');
                    var rec = {
                        Time: '', PressureIn: 0, Humidity: 0, TemperatureF: 0, WindDirectionDegrees: 0, HourlyPrecipIn: 0, dailyrainin: 0,
                        WindSpeedMPH: 0, WindSpeedGustMPH: 0,
                    };
                    hdr.forEach((col, idx) => {
                        rec[col] = cols[idx];
                    });
                    var atime = rec.Time.split(' ');
                    let archiveDate = moment(atime[0], 'YYYY-MM-DD').format('MM/DD/YYYY');
                    let archiveTime = atime[1].substr(0, 5);
                    mongo.find('archive', { archiveDate: archiveDate, archiveTime: archiveTime }).next().then(arch => {
                        if (arch != null) {
                            arch.rainClicks = (rec.dailyrainin - lastRain) * 100;
                            if (arch.rainClicks < 0)
                                arch.rainClicks = 0;
                            //arch.windAvg = rec.WindSpeedMPH;
                            //arch.windHi = rec.WindSpeedGustMPH;
                            //arch.windHiDir = rec.WindDirectionDegrees;
                            //arch._id = moment(rec.Time, "YYYY-MM-DD HH:mm:ss").unix();
                            lastRain = rec.dailyrainin;
                            mongo.update('archive', arch, false).then(() => {
                                inserted++;
                                console.log('updated ' + arch.archiveDate + ' ' + arch.archiveTime);
                                lastUpdate = new Date();
                                row = null;
                            }, err => {
                                console.log('error ' + arch.archiveDate + ' ' + arch.archiveTime);
                                row = null;
                            });
                        }
                        else {
                            console.log('not found ' + archiveDate + ' ' + archiveTime);
                            row = null;
                        }
                    }, err => {
                        console.log(err);
                        row = null;
                    });
                }
                if (rows.length == 0) {
                    clearInterval(tmr);
                    nextDay();
                }
            }, 10);
        }, err => {
            console.log(err);
        });
    }
    ;
    function nextDay() {
        beginDt = beginDt.add(1, 'days');
        if (beginDt.unix() >= endDt.unix()) {
            process.exit(0);
        }
        else {
            updateArchive(beginDt);
        }
    }
});
//# sourceMappingURL=test.js.map