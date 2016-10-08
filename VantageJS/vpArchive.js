"use strict";
const vpBase_1 = require('./vpBase');
class vpArchive extends vpBase_1.default {
    constructor(data, index) {
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
        }
        this.dataIndx += 22;
        this._data = null;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = vpArchive;
//# sourceMappingURL=vpArchive.js.map