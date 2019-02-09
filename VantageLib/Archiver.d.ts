import Database from './Database';
import ClientSocket from './ClientSocket';
export default class Archiver {
    config: any;
    database: Database;
    socket: ClientSocket;
    constructor();
    update(): Promise<{}>;
    getArchives(lastdate: any): Promise<any>;
}
//# sourceMappingURL=Archiver.d.ts.map