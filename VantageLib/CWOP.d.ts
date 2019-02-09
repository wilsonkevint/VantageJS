import VPCurrent from './VPCurrent';
import VPHiLow from './VPHiLow';
import QueryEngine from './QueryEngine';
export default class CWOP {
    config: any;
    current: VPCurrent;
    client: any;
    hilows: VPHiLow;
    cwopUpdated: boolean;
    queryEngine: QueryEngine;
    constructor();
    update(current: VPCurrent, hilows: VPHiLow): Promise<{}>;
    dataReceived(data: any): void;
    formatNum(num: any, len: any): string | number;
    updateFromArchive(): Promise<{}>;
}
//# sourceMappingURL=CWOP.d.ts.map