//declare function require(name: string); 
//const Mapper = require('sqlite-orm');
//const Migration = Mapper.Migration;
//const ModelBase = Mapper.ModelBase;
//const path = require('path'); 
//var sqlite3 = require('sqlite3').verbose();
//import VPArchive from './VPArchive';

//export default class Database {
//    static create() {
//        Migration.createTable('Archive', function (t) {
//            t.addColumn('_id', 'INTEGER');
//            t.addColumn('archiveDate', 'TEXT');
//            t.addColumn('temperature', 'REAL');
//            t.addColumn('temperatureHi', 'REAL');
//            t.addColumn('temperatureLow', 'REAL');
//            t.addColumn('rainClicks', 'INTEGER');
//            t.addColumn('rainHiRate', 'REAL');
//            t.addColumn('barometer', 'REAL');
//            t.addColumn('radiation', 'INTEGER');
//            t.addColumn('insideTemp', 'REAL');
//            t.addColumn('insideHumidity', 'INTEGER');
//            t.addColumn('humidity', 'INTEGER');
//            t.addColumn('windAvg', 'INTEGER');
//            t.addColumn('windHi', 'INTEGER');
//            t.addColumn('windHiDir', 'INTEGER');
//            t.addColumn('prevWindDir', 'INTEGER');
//            t.addColumn('avgUvIndex', 'INTEGER');
//        });

//        Migration.createTable('Configurations', function (t) {
//            t.addColumn('lastUpdate', 'INTEGER');            
//        });
         
//        var mapper = new Mapper(path.resolve('.', 'weather.db'));
//        mapper.sync().then(function () {
//        });
        
//    }  
//}

//export class Archive {
//    db: any;
//    constructor(db: any) {
//        this.db = db;
//    }

//    getById(id:number) {
//        var stmt = "SELECT * FROM Archive WHERE _id = " + id;    
        
//        var promise = new Promise((resolve, reject) => {
//            var archives = new Array<VPArchive>();

//            this.db.all(stmt, (err, rows) => {
//                for (var i = 0; i < rows.length; i++) {
//                    var row = rows[i];
//                    var archive = new VPArchive(null, 0);
//                    Object.keys(row).forEach(col => {
//                        archive[col] = row[col];
//                        archives.push(archive);
//                    });
//                }
//                resolve(archives);
//            }, err => reject(err))
//        });

//        return promise;      
//    }

//    insert(archive: VPArchive) {
//        var promise = new Promise((resolve, reject) => {

//            var stmt = this.db.prepare("INSERT INTO Archive")")
//        });
//    }
//}

//Database.create();
 