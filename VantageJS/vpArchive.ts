import VPBase from './VPBase';
export default class VPArchive extends VPBase {

    constructor(data: Uint8Array, index:number) {
        super(data);
        this.dataIndx = index + 1;

        if (this.peek(0) != 255) {

            var archDateTime = this.nextDateTime();
            if (archDateTime) {
                this.archiveDate = archDateTime.format("MM/DD/YYYY");
                this.archiveTime = archDateTime.format("HH:mm");
            }
            this.outTemp = this.fTemperature();
            this.outTempHi = this.fTemperature();
            this.outTempLow = this.fTemperature();
            this.rainClicks = this.nextDecimal();
            this.rainHiRate = this.fRain();
            this.barometer = this.fBarometer();
            this.radition = this.nextDecimal();
            this.windSamples = this.nextDecimal();
            this.inTemp = this.fTemperature();
            this.inHumidity = this.nextByte();
            this.humidity = this.nextByte();
            this.windAvg = this.nextByte();
            this.windHi = this.nextByte();
            this.windHiDir = this.nextByte();
            this.prevWindDir = this.nextByte();
            this.avgUvIndex = this.nextByte();
            this.et = this.nextByte();
        }

        this.dataIndx += 22;
        this._data = null;
        
    }

    archiveDate: Date;
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