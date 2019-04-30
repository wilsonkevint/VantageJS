import * as Common from './Common';
import QueryEngine from './QueryEngine';

const Http = require('http');
const moment = require('moment');

export default class DataServer {
    server: any;   
    config: any;
    queryEngine: QueryEngine;

    constructor() {
        this.config = require('./VantageJS.json');
        this.queryEngine = new QueryEngine(this.config);
    }

    start() {
        Common.Logger.init('cwop.log');
        Common.Logger.info('started');
        this.server = Http.createServer((req, res) => { this.requestReceived(req, res) });
        this.server.listen(this.config.dataPort);
        console.log('web server listening on ' + this.config.dataPort);
    }    

    requestReceived(req, res) {
        let hdr = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
        let allowOrigins = '*';
        Common.Logger.info('WebRequest ' + moment().format('hh:mm:ss') + ' ' + req.url);

        try {

            if (req.url.indexOf('/archives') > -1) {
                var args = req.url.split(/[&,?,=]+/);
                var startDt = null;
                var period = null;
                var ctype = 'application/json';
                if (args.length > 1)
                    startDt = decodeURI(args[2]);
                if (args.length > 2 && args[3] == 'period')
                    period = args[4];

                if (args.includes('csv'))
                    ctype = 'text/csv';

                this.queryEngine.connectDB().then(() => {
                    if (!period) {

                        this.queryEngine.getArchivesDB(startDt, 'months').then((archives: any) => {

                            res.writeHead(200, { 'Content-Type': ctype, 'Access-Control-Allow-Origin': allowOrigins });

                            if (ctype == 'application/json') {
                                res.end(JSON.stringify(archives));
                            }
                            else {
                                var data = this.getCsv(archives);
                                data.forEach(d => {
                                    res.write(d);
                                })
                                res.end();
                            }

                        });

                    }
                    else {
                        this.queryEngine.getArchivesSum(startDt, period).then(archives => {
                            res.writeHead(200, { 'Content-Type': ctype, 'Access-Control-Allow-Origin': allowOrigins });
                            if (ctype == 'application/json') {
                                res.end(JSON.stringify(archives));
                            }
                            else {
                                var data = this.getCsv(archives);
                                data.forEach(d => {
                                    res.write(d);
                                })
                                res.end();
                            }
                        });
                    }
                });

            }
            
            else {
                res.writeHead(200, hdr);
                res.end("no data");
            }
            
        }
        catch (e) {
            Common.Logger.error('RequestReceived:' + e);
            res.end('error:' + e);
        }
    }    

    getCsv(archives: any) {
        var data = [];
        var headers = [];

        archives.forEach(arch => {
            var drow = '';
            if (!headers.length) {
                Object.keys(arch).forEach(col => {
                    headers.push(col);
                    drow += col + '\t';
                });
            }
            else {
                Object.keys(arch).forEach(col => {
                    if (typeof arch[col] == 'object')
                        arch[col] = JSON.stringify(arch[col]);
                    drow += arch[col] + '\t';
                });
            }
            data.push(drow + '\n');
        });

        return data;
    }

    
}
