import QueryEngine from './QueryEngine';
export default class DataServer {
    server: any;
    config: any;
    queryEngine: QueryEngine;
    constructor();
    start(): void;
    requestReceived(req: any, res: any): void;
    getCsv(archives: any): any[];
}
//# sourceMappingURL=DataServer.d.ts.map