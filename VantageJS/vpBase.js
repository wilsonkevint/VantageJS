"use strict";
var moment = require('moment');
var vpBase = (function () {
    function vpBase(data) {
        this._data = data;
    }
    vpBase.prototype.nextByte = function () {
        var val = this._data[this.dataIndx];
        this.dataIndx += 1;
        return val;
    };
    vpBase.prototype.nextDecimal = function () {
        var byte1 = this.nextByte();
        var byte2 = this.nextByte();
        return byte2 * 256 + byte1;
    };
    vpBase.prototype.nextTime = function () {
        var time = this.nextDecimal();
        var tm;
        if (time != 65535) {
            var hrs = Math.floor(time / 100);
            var mins = Math.floor((time / 100 - hrs) * 100);
        }
        else
            return "";
        return moment().hours(hrs).minutes(mins).format('h:mm a');
    };
    vpBase.prototype.peek = function (offset) {
        return this._data[this.dataIndx + offset];
    };
    vpBase.round = function (value, precision) {
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    };
    vpBase.prototype.temperature = function () {
        var temp1 = this.peek(0);
        var temp2 = this.peek(1);
        var temp = this.nextDecimal();
        if (temp2 == 255)
            temp = -(255 - temp1);
        try {
            temp = vpBase.round(temp, 2) / 10;
        }
        catch (x) {
        }
        return temp;
    };
    vpBase.prototype.rain = function () {
        var rain = this.nextDecimal();
        if (rain == 65535)
            rain = 0;
        return vpBase.round(rain, 2) / 100;
    };
    vpBase.date = function (dt) {
        if (dt == 65535 || dt == 0)
            return null;
        var yrs = (dt & 0x7f) + 2000;
        var days = (dt & 0xf80) >> 7;
        var month = (dt & 0xF000) >> 12;
        console.log(yrs.toString() + '-' + month.toString() + '-' + days.toString());
        return moment(yrs.toString() + '-' + month.toString() + '-' + days.toString()).format('MM/DD/YYYY');
    };
    return vpBase;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = vpBase;
//# sourceMappingURL=vpBase.js.map