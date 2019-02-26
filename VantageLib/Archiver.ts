//Archiver class - writes archive records to database by calling web service hosted by appVantage (which reads archive data from device)
import Database from './Database';
import VPArchive from './VPArchive';
import WebRequest from './WebRequest';
import VPCurrent from './VPCurrent';
import * as Common from './Common';
import ClientSocket from './ClientSocket';
const moment = require('moment');

export default class Archiver {
    config: any;
    database: Database;
    socket: ClientSocket;
    lastId: number;
    inserted: number;
    archives: Array<VPArchive>;
   
    constructor() {
        this.config = require('./VantageJS.json');
        this.database = new Database();       
    }    

    async update() {

        if (this.socket == null) {
            this.socket = new ClientSocket();
            await this.socket.startAsync();
        }

        await this.database.connect();
        let last: VPArchive = await this.database.getLast('archive');
        let lastDt = last ? last.archiveDate + ' ' + last.archiveTime : null;
        this.lastId = last ? last._id : 0;

        let data = await this.getArchives(lastDt);

        try {

            this.archives = JSON.parse(data);
            let idx = -1;
            this.inserted = 0;

            this.insertArchives(idx);

            Common.Logger.info('inserted ' + this.inserted + ' archive rows');
        }
        catch (err) {
            Common.Logger.error(err);
            this.socket.socketEmit('error', 'Archiver:' + err);
        }
    }

    insertArchives(idx) {
        idx++;
        if (idx == this.archives.length) {
            return;
        }

        let a: VPArchive = this.archives[idx];
        a._id = moment(a.archiveDate + ' ' + a.archiveTime, 'MM/DD/YYYY HH:mm').unix();    

        if (a._id > this.lastId) {
            this.database.insert('archive', a).then(() => {               
                this.inserted++;
                this.insertArchives(idx);
                this.socket.socketEmit('archive', a.archiveDate.toString() + ' ' + a.archiveTime.toString());
            }).catch(err => {
                Common.Logger.error(err);
                this.insertArchives(idx);
            });
        }
        else {
            this.insertArchives(idx);
        }       
    }   

    async getArchives(lastdate) {
        let path = '/archives';
        let args = { dt: lastdate };
        let timeout = 60 * 5 * 1000;
        return WebRequest.get(this.config.webUrl, path,args,timeout);
    }

    
}