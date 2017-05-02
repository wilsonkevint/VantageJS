"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var vpBase_1 = require('./vpBase');
var VpArchive = (function (_super) {
    __extends(VpArchive, _super);
    function VpArchive(data, index) {
        _super.call(this, data);
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
            this.avgUvIndex = this.nextByte();
            this.et = this.nextByte();
        }
        this.dataIndx += 22;
        this._data = null;
    }
    return VpArchive;
}(vpBase_1.default));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VpArchive;
//# sourceMappingURL=vpArchive.js.map