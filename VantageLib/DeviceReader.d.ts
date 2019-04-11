/// <reference types="node" />
import VPArchive from './VPArchive';
import { VPCurrent } from './VPCurrent';
import { VPHiLow } from './VPHiLow';
import { EventEmitter } from 'events';
export default class DeviceReader {
    config: any;
    port: any;
    isBusy: boolean;
    pauseTimer: any;
    lastLoop: any;
    dataReceived: any;
    loopTimer: any;
    hiLowTimer: any;
    current: VPCurrent;
    hilows: VPHiLow;
    eventEmitter: EventEmitter;
    constructor();
    emitEvent(name: string, obj: any): void;
    errorReceived(err: any): void;
    getSerial(cmd: any, reqchars: number, expectAck: boolean): Promise<Uint8Array>;
    getHiLows(): Promise<any>;
    isAvailable(): Promise<boolean>;
    pauseLoop(secs: any): void;
    init(): void;
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
    subscribeCurrent(listener: any): void;
    subscribeHiLow(listener: any): void;
    subscribeAlert(listener: any): void;
    subscribeError(listener: any): void;
    validateLoop(data: any): boolean;
    static validateCRC(data: Uint8Array, start: any): boolean;
    static getCRC(data: any): any;
    static crc_table: number[];
}
//# sourceMappingURL=DeviceReader.d.ts.map