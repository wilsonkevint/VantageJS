"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const VPBase_1 = require("./VPBase");
class VPHiLow extends VPBase_1.default {
    constructor(data) {
        super(data);
        this.dataIndx = 0;
        if (data == null)
            return;
        this.barometer = this.fBarometerHL();
        this.windSpeed = this.fWindSpeed();
        this.inTemperature = this.fTemperatureHL(false);
        this.inHumidity = this.fHumidity(false);
        this.temperature = this.fTemperatureHL(true);
        this.dewpoint = this.fDewPoint();
        this.windChill = this.fWindChill();
        this.heatIndex = this.fHeatIndex();
        this.thswIndex = this.fHeatIndex();
        this.radiation = this.fHeatIndex();
        this.uvHigh = this.fUVHigh();
        this.rainHigh = this.fRainHL();
        this.dataIndx += 150; //extra/leaf/soil
        this.humidity = this.fHumidity(true);
        this._data = null;
    }
    fBarometerHL() {
        var hilow = new HiLow();
        hilow.dailyLow = VPBase_1.default.round(this.nextDecimal() / 1000, 2);
        hilow.dailyHi = VPBase_1.default.round(this.nextDecimal() / 1000, 2);
        hilow.monthLow = VPBase_1.default.round(this.nextDecimal() / 1000, 2);
        hilow.monthHi = VPBase_1.default.round(this.nextDecimal() / 1000, 2);
        hilow.yearLow = VPBase_1.default.round(this.nextDecimal() / 1000, 2);
        hilow.yearHi = VPBase_1.default.round(this.nextDecimal() / 1000, 2);
        hilow.dailyLowTime = this.nextTime();
        hilow.dailyHighTime = this.nextTime();
        return hilow;
    }
    fWindSpeed() {
        var hilow = new HiLow();
        hilow.dailyHi = this.nextByte();
        hilow.dailyHighTime = this.nextTime();
        hilow.monthHi = this.nextByte();
        hilow.yearHi = this.nextByte();
        return hilow;
    }
    fTemperatureHL(outside) {
        var hilow = new HiLow();
        //the sequence of low high is reversed inside vs outside (blame Davis)
        var dailyHi = this.fTemperature();
        var dailyLow = this.fTemperature();
        var dailyHighTime = this.nextTime();
        var dailyLowTime = this.nextTime();
        var monthLow = this.fTemperature();
        var monthHi = this.fTemperature();
        var yearLow = this.fTemperature();
        var yearHi = this.fTemperature();
        hilow.dailyLow = (outside ? dailyHi : dailyLow);
        hilow.dailyHi = (outside ? dailyLow : dailyLow);
        hilow.dailyHighTime = (outside ? dailyLowTime : dailyHighTime);
        hilow.dailyLowTime = (outside ? dailyHighTime : dailyLowTime);
        hilow.monthHi = (outside ? monthLow : monthHi);
        hilow.monthLow = (outside ? monthHi : monthLow);
        hilow.yearHi = (outside ? yearLow : yearHi);
        hilow.yearLow = (outside ? yearHi : yearLow);
        return hilow;
    }
    fHumidity(outside) {
        var hilow = new HiLow();
        if (!outside) {
            hilow.dailyHi = this.nextByte();
            hilow.dailyLow = this.nextByte();
            hilow.dailyHighTime = this.nextTime();
            hilow.dailyLowTime = this.nextTime();
            hilow.monthHi = this.nextByte();
            hilow.monthLow = this.nextByte();
            hilow.yearHi = this.nextByte();
            hilow.yearLow = this.nextByte();
        }
        else {
            hilow.dailyLow = this.nextByte();
            this.dataIndx += 7;
            hilow.dailyHi = this.nextByte();
            this.dataIndx += 7;
            hilow.dailyLowTime = this.nextTime();
            this.dataIndx += 14;
            hilow.dailyHighTime = this.nextTime();
            this.dataIndx += 14;
            hilow.monthHi = this.nextByte();
            this.dataIndx += 7;
            hilow.monthLow = this.nextByte();
            this.dataIndx += 7;
            hilow.yearHi = this.nextByte();
            this.dataIndx += 7;
            hilow.yearLow = this.nextByte();
            this.dataIndx += 7;
        }
        return hilow;
    }
    fDewPoint() {
        var hilow = new HiLow();
        hilow.dailyLow = this.nextDecimal();
        hilow.dailyHi = this.nextDecimal();
        hilow.dailyLowTime = this.nextTime();
        hilow.dailyHighTime = this.nextTime();
        hilow.monthHi = this.nextDecimal();
        hilow.monthLow = this.nextDecimal();
        hilow.yearHi = this.nextDecimal();
        hilow.yearLow = this.nextDecimal();
        return hilow;
    }
    fWindChill() {
        var low = new HiLow();
        low.dailyLow = this.nextDecimal();
        low.dailyLowTime = this.nextTime();
        low.monthLow = this.nextDecimal();
        low.yearLow = this.nextDecimal();
        return low;
    }
    fHeatIndex() {
        var hi = new HiLow();
        hi.dailyHi = this.nextDecimal();
        hi.dailyHighTime = this.nextTime();
        hi.monthHi = this.nextDecimal();
        hi.yearHi = this.nextDecimal();
        return hi;
    }
    fRainHL() {
        var hi = new HiLow();
        hi.dailyHi = this.nextDecimal() / 100;
        hi.dailyHighTime = this.nextTime();
        hi.hourlyHi = this.nextDecimal() / 100;
        hi.monthHi = this.nextDecimal() / 100;
        hi.yearHi = this.nextDecimal() / 100;
        return hi;
    }
    fUVHigh() {
        var hi = new HiLow();
        hi.dailyHi = this.nextByte();
        hi.dailyHighTime = this.nextTime();
        hi.monthHi = this.nextByte();
        hi.yearHi = this.nextByte();
        return hi;
    }
}
exports.default = VPHiLow;
class HiLow {
}
//# sourceMappingURL=VPHiLow.js.map