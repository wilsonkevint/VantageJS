import Database from './Database';
import VPArchive from './VPArchive';
import ClientSocket from './ClientSocket';
export default class Archiver {
    config: any;
    database: Database;
    socket: ClientSocket;
    lastId: number;
    inserted: number;
    archives: Array<VPArchive>;
    constructor();
    update(): Promise<void>;
    insertArchives(idx: any): void;
    getArchives(lastdate: any): Promise<any>;
}
//# sourceMappingURL=Archiver.d.ts.map