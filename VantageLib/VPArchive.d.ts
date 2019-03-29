import { VPBase } from './VPBase';
export default class VPArchive extends VPBase {
    constructor(data: Uint8Array, index: number);
    archiveDate: string;
    archiveTime: string;
    outTemp: number;
    outTempHi: number;
    outTempLow: number;
    rainClicks: number;
    rainHiRate: number;
    barometer: number;
    radition: number;
    windSamples: number;
    inTemp: number;
    inHumidity: number;
    humidity: number;
    windAvg: number;
    windHi: number;
    windHiDir: number;
    prevWindDir: number;
    avgUvIndex: number;
    et: number;
    _id: number;
}
//# sourceMappingURL=VPArchive.d.ts.map