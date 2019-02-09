import VPCurrent from '../VantageLib/VPCurrent';
import VPHiLow from '../VantageLib/VPHiLow';
import QueryEngine from '../VantageLib/QueryEngine';
export default class Server {
    server: any;
    io: any;
    vwsSocket: any;
    hilows: VPHiLow;
    current: VPCurrent;
    vp1current: VPCurrent;
    alerts: any;
    lastContact: any;
    clients: Array<any>;
    config: any;
    queryEngine: QueryEngine;
    constructor();
    start(): void;
    onConnection(socket: any): void;
    requestReceived(req: any, res: any): void;
    sendCurrent(): void;
    sendHiLows(): void;
    sendAlerts(): void;
    getCsv(archives: any): any[];
    getRainDay(period: any): any;
}
//# sourceMappingURL=Server.d.ts.map