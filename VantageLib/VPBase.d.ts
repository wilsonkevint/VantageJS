export declare class VPBase {
    _data: Uint8Array;
    dataIndx: number;
    constructor(data: Uint8Array);
    nextByte(): number;
    nextDateTime(): any;
    nextDecimal(): number;
    nextTime(): string;
    peek(offset: any): number;
    static round(value: any, precision: any): number;
    fBarometer(): number;
    fTemperature(): number;
    fRain(): number;
    static date(dt: number): string;
    static pad(num: number, size: number): string;
    static timeDiff(dt: Date, type: string): number;
    static getDateTimeStamp(dt: string): any;
    static uint16(n: any): number;
}
//# sourceMappingURL=VPBase.d.ts.map