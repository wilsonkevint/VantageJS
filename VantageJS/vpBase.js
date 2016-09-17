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
    vpBase.prototype.nextDateTime = function () {
        var dt;
        var ardate = this.nextDecimal();
        var artime = this.nextDecimal();
        if (ardate == 65535 || !ardate) {
            return null;
        }
        var yrs = ardate / 512 + 2000;
        var months = ardate % 512 / 32;
        var days = ardate % 512 % 32;
        var hrs = artime / 100;
        var min = artime % 100;
        try {
            dt = new moment(yrs.toString() + vpBase.pad(months, 2) + vpBase.pad(days, 2), 'YYYYMMDD');
        }
        catch (x) {
            return null;
        }
        return dt.format('MM/DD/YYYY HH:mm');
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
    vpBase.prototype.fBarometer = function () {
        var barom = this.nextDecimal() / 1000;
        return vpBase.round(barom, 2);
    };
    vpBase.prototype.fTemperature = function () {
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
    vpBase.prototype.fRain = function () {
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
        var mdt = yrs.toString() + ' ' + vpBase.pad(month, 2) + ' ' + vpBase.pad(days, 2);
        mdt = moment(mdt, 'YYYY MM DD').format('MM/DD/YYYY');
        return mdt;
    };
    vpBase.pad = function (num, size) {
        var s = "000000000" + num;
        return s.substr(s.length - size);
    };
    vpBase.timeDiff = function (dt, type) {
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
    vpBase.getDateTimeStamp = function (dt) {
        var dtStamp;
        var tmStamp;
        dtStamp = (dt.Day + dt.Month * 32 + (dt.Year - 2000) * 512);
        tmStamp = (dt.Hour * 100 + dt.Minute);
        var data = new Array(4);
        data[0] = (dtStamp % 256);
        data[1] = (dtStamp / 256);
        data[2] = (tmStamp % 256);
        data[3] = (tmStamp / 256);
        return data;
    };
    return vpBase;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = vpBase;
//# sourceMappingURL=vpBase.js.map