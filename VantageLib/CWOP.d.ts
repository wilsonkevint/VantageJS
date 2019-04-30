import { VPCurrent } from './VPCurrent';
import { VPHiLow } from './VPHiLow';
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
    closeClient(): void;
    dataReceived(data: any): boolean;
    formatNum(num: any, len: any): string | number;
    updateFromArchive(): Promise<void>;
}
//# sourceMappingURL=CWOP.d.ts.map