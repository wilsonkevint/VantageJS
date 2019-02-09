import VPArchive from '../VantageLib/VPArchive';
import VPCurrent from '../VantageLib/VPCurrent';
import VPHiLow from '../VantageLib/VPHiLow';
export default class DeviceReader {
    config: any;
    port: any;
    isBusy: boolean;
    pauseTimer: any;
    lastLoop: any;
    dataReceived: any;
    errorReceived: any;
    loopTimer: any;
    hiLowTimer: any;
    currentReceived: any;
    hilowReceived: any;
    current: VPCurrent;
    hilows: VPHiLow;
    constructor();
    getSerial(cmd: any, reqchars: number, expectAck: boolean): Promise<Uint8Array>;
    getHiLows(): Promise<any>;
    isAvailable(): Promise<boolean>;
    pauseLoop(secs: any): void;
    start(): Promise<void>;
    startLoop(): void;
    gotLoop(data: any): void;
    setTime(): Promise<boolean>;
    sendCommand(cmd: any, binres?: boolean): Promise<any>;
    wakeUp(): Promise<boolean>;
    getArchives(startDate: string): Promise<Array<VPArchive>>;
    static getArchiveTS(startDate: string): any[];
    retrieveArchive(buffer: any, allPages: any): Promise<VPArchive[]>;
    sendArchiveCmd(cmd: any): Promise<Uint8Array>;
    validateLoop(data: any): boolean;
    static validateCRC(data: Uint8Array, start: any): boolean;
    static getCRC(data: any): any;
    static crc_table: number[];
}
//# sourceMappingURL=DeviceReader.d.ts.map