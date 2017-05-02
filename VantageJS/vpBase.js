"use strict";
var moment = require('moment');
var VpBase = (function () {
    function VpBase(data) {
        this._data = data;
        this.dataIndx = 0;
    }
    VpBase.prototype.nextByte = function () {
        var val = this._data[this.dataIndx];
        this.dataIndx += 1;
        return val;
    };
    VpBase.prototype.nextDateTime = function () {
        var dt;
        var ardate = this.nextDecimal();
        var artime = this.nextDecimal();
        if (ardate == 65535 || !ardate) {
            return null;
        }
        var yrs = VpBase.uint16(ardate / 512 + 2000);
        var months = VpBase.uint16(ardate % 512 / 32);
        var days = VpBase.uint16(ardate % 512 % 32);
        var hrs = VpBase.uint16(artime / 100);
        var min = VpBase.uint16(artime % 100);
        try {
            dt = new moment(yrs.toString() + VpBase.pad(months, 2) + VpBase.pad(days, 2) + VpBase.pad(hrs, 2) + VpBase.pad(min, 2), 'YYYYMMDDHH:mm');
        }
        catch (x) {
            return null;
        }
        return dt;
    };
    VpBase.prototype.nextDecimal = function () {
        var byte1 = this.nextByte();
        var byte2 = this.nextByte();
        return byte2 * 256 + byte1;
    };
    VpBase.prototype.nextTime = function () {
        var time = this.nextDecimal();
        var tm;
        var hrs;
        var mins;
        if (time != 65535) {
            hrs = Math.floor(time / 100);
            mins = Math.floor((time / 100 - hrs) * 100);
        }
        else
            return "";
        return moment().hours(hrs).minutes(mins).format('h:mm a');
    };
    VpBase.prototype.peek = function (offset) {
        return this._data[this.dataIndx + offset];
    };
    VpBase.round = function (value, precision) {
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    };
    VpBase.prototype.fBarometer = function () {
        var barom = this.nextDecimal() / 1000;
        return VpBase.round(barom, 2);
    };
    VpBase.prototype.fTemperature = function () {
        var temp1 = this.peek(0);
        var temp2 = this.peek(1);
        var temp = this.nextDecimal();
        if (temp2 == 255)
            temp = -(255 - temp1);
        try {
            temp = VpBase.round(temp, 2) / 10;
        }
        catch (x) {
        }
        return temp;
    };
    VpBase.prototype.fRain = function () {
        var rain = this.nextDecimal();
        if (rain == 65535)
            rain = 0;
        return VpBase.round(rain, 2) / 100;
    };
    VpBase.date = function (dt) {
        if (dt === 65535 || dt === 0)
            return null;
        var yrs = (dt & 0x7f) + 2000;
        var days = (dt & 0xf80) >> 7;
        var month = (dt & 0xF000) >> 12;
        var mdt = yrs.toString() + ' ' + VpBase.pad(month, 2) + ' ' + VpBase.pad(days, 2);
        mdt = moment(mdt, 'YYYY MM DD').format('MM/DD/YYYY');
        return mdt;
    };
    VpBase.pad = function (num, size) {
        var s = "000000000" + num;
        return s.substr(s.length - size);
    };
    VpBase.timeDiff = function (dt, type) {
        var diff = new Date().getMilliseconds() - dt.getMilliseconds();
        diff = Math.abs(diff);
        var seconds = Math.floor(diff / 1000);
        var minutes = Math.floor(seconds / 60);
        var hours = Math.floor(minutes / 60);
        switch (type) {
            case 'h':
                diff = hours;
                break;
            case 'm':
                diff = minutes;
                break;
            case 's':
                diff = seconds;
                break;
        }
        return diff;
    };
    VpBase.getDateTimeStamp = function (dt) {
        var mdt = moment(dt, 'MM/DD/YYYY');
        var month = mdt.month() + 1;
        var dtStamp = (mdt.date() + month * 32 + (mdt.year() - 2000) * 512);
        var tmStamp = (mdt.hour() * 100 + mdt.minute());
        var data = new Array(4);
        data[0] = (dtStamp % 256);
        data[1] = Math.round(dtStamp / 256);
        data[2] = (tmStamp % 256);
        data[3] = Math.round(tmStamp / 256);
        return data;
    };
    VpBase.uint16 = function (n) {
        return n & 0xFFFF;
    };
    return VpBase;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VpBase;
//# sourceMappingURL=vpBase.js.map