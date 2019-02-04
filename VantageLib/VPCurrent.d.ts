import VPBase from './VPBase';
export default class VPCurrent extends VPBase {
    constructor(data: Uint8Array);
    barometerTrend: string;
    barometer: number;
    inTemperature: number;
    inHumidity: number;
    temperature: number;
    windSpeed: number;
    windAvg: number;
    windDir: number;
    windDirection: string;
    humidity: number;
    dewpoint: number;
    rainRate: number;
    stormRain: number;
    stormDate: string;
    dayRain: number;
    monthRain: number;
    yearRain: number;
    battery: number;
    voltage: number;
    forecastIcon: string;
    forecastRule: number;
    sunrise: string;
    sunset: string;
    windChill: number;
    dateLoaded: Date;
    wuUpdated: any;
    fBarometerTrend(): string;
    fWindDirection(degrees: any): string;
    static fDewpoint(temperature: number, rh: number): number;
    fStormDate(): string;
    fForecastIcon(): string;
    fWindChill(): number;
}
//# sourceMappingURL=VPCurrent.d.ts.map