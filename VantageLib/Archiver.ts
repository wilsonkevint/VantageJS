import Database from './Database';
import VPArchive from './VPArchive';
import WebRequest from './WebRequest';
import VPCurrent from './VPCurrent';
import * as Common from './Common';
import ClientSocket from './ClientSocket';

let moment = require('moment');

export default class Archiver {
    config: any;
    database: Database;
    socket: ClientSocket;

    constructor() {
        this.config = require('./VantageJS.json');;
        this.database = new Database();       
    }

    async update() {

        if (this.socket == null) {
            this.socket = new ClientSocket();
            this.socket.start();
        }
        
        let promise = new Promise(async (resolve, reject) => {
            try {
                await this.database.connect();
                let last: VPArchive = await this.database.getLast('archive');
                let lastDt = last ? last.archiveDate + ' ' + last.archiveTime : null;
                let lastId = last ? last._id : 0;

                let data = await this.getArchives(lastDt);
                let archives: Array<VPArchive> = JSON.parse(data);
                let inserted = 0; 

                archives.forEach(async (a: VPArchive) => {
                    a._id = moment(a.archiveDate + ' ' + a.archiveTime, 'MM/DD/YYYY HH:mm').unix();

                    if (a._id > lastId) {
                        this.database.insert('archive', a).then(() => {
                            inserted++;
                        }).catch(err => {
                            Common.Logger.error(err);
                        });                        
                    }
                });

                Common.Logger.info('inserted ' + inserted + ' archive rows');
            }
            catch (err) {
                Common.Logger.error(err);
                this.socket.socketEmit('error', 'Archiver:' + err);
            }
            
        });

        return promise;
    }  

    async getArchives(lastdate) {
        let path = '/archives';
        let args = { dt: lastdate };
        let timeout = 60 * 5 * 1000;
        return WebRequest.get(this.config.webUrl, path,args,timeout);
    }

    
}