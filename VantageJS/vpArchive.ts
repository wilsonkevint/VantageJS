import vpBase from './vpBase';

export default class vpArchive extends vpBase {

    constructor(data: Uint8Array) {
        super(data);        
        if (data[0] == 6)
            this.dataIndx++;

        this.archiveDate = this.nextDateTime();
        this.outTemp = this.fTemperature();
        this.outTempHi = this.fTemperature();
        this.outTempLow = this.fTemperature();
        this.rainClicks = this.fTemperature();
        this.rainHiRate = this.fRain();
        this.barometer = this.fBarometer();
        this.radition = this.nextDecimal();
        this.windSamples = this.nextDecimal();
        this.inTemp = this.fTemperature();
        this.inHumidity = this.nextByte();
        this.outHumidity = this.nextByte();
        this.windAvg = this.nextByte();
        this.windHi = this.nextByte();
        this.windHiDir = this.nextByte();
        this.prevWindDir = this.nextByte();
        this.avgUVIndex = this.nextByte();
        this.ET = this.nextByte(); 

        this.dataIndx += 22;
        
    }

    archiveDate: Date;
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
    outHumidity: number;
    windAvg: number;
    windHi: number;
    windHiDir: number;
    prevWindDir: number;
    avgUVIndex: number;
    ET: number;


}