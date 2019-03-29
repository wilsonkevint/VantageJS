import { VPBase } from './VPBase';
export declare class VPHiLow extends VPBase {
    constructor(data: Uint8Array);
    barometer: HiLow;
    windSpeed: HiLow;
    inTemperature: HiLow;
    inHumidity: HiLow;
    temperature: HiLow;
    dewpoint: HiLow;
    windChill: HiLow;
    heatIndex: HiLow;
    thswIndex: HiLow;
    radiation: HiLow;
    uvHigh: HiLow;
    rainHigh: HiLow;
    humidity: HiLow;
    dateLoaded: Date;
    forecast: any;
    rain1hour: number;
    rain24hour: number;
    fBarometerHL(): HiLow;
    fWindSpeed(): HiLow;
    fTemperatureHL(outside: boolean): HiLow;
    fHumidity(outside: boolean): HiLow;
    fDewPoint(): HiLow;
    fWindChill(): HiLow;
    fHeatIndex(): HiLow;
    fRainHL(): HiLow;
    fUVHigh(): HiLow;
}
declare class HiLow {
    hourlyHi: any;
    dailyLow: any;
    dailyHi: any;
    monthLow: any;
    monthHi: any;
    yearLow: any;
    yearHi: any;
    dailyLowTime: any;
    dailyHighTime: any;
}
export {};
//# sourceMappingURL=VPHiLow.d.ts.map