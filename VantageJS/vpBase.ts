declare function require(name: string);
var moment = require('moment');

export default class VpBase {
    _data: Uint8Array;
    dataIndx: number;

    public constructor(data: Uint8Array) {
        this._data = data;
        this.dataIndx = 0;
    }

    nextByte() :number {
        var val = this._data[this.dataIndx];
        this.dataIndx += 1;
        return val;
    }

    nextDateTime(): any {
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
            dt = new moment(yrs.toString() + VpBase.pad(months, 2) + VpBase.pad(days, 2) + VpBase.pad(hrs, 2) + VpBase.pad(min,2), 'YYYYMMDDHH:mm');  
        }
        catch (x) {
            return null;
        }

        return dt;

    }

    nextDecimal() :number {
        var byte1 = this.nextByte();
        var byte2 = this.nextByte();

        return byte2 * 256 + byte1;
    }

    nextTime() :string {
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
    }

    peek(offset) :number {
        return this._data[this.dataIndx + offset];
    }

    static round(value, precision) :number {
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

    fBarometer(): number {
        var barom = this.nextDecimal() / 1000;

        return VpBase.round(barom, 2);
    }

    fTemperature() : number {
        var temp1 = this.peek(0);
        var temp2 = this.peek(1);

        var temp = this.nextDecimal();

        if (temp2 == 255)
            temp = -(255 - temp1);

        try {
            temp = VpBase.round(temp,2) / 10;
        }
        catch (x) {
        }

        return temp;
    }

    fRain(): number {
        var rain = this.nextDecimal();
        if (rain == 65535)
            rain = 0;

        return VpBase.round(rain, 2) / 100;
    }

    static date(dt: number): string {
               
        if (dt === 65535 || dt === 0)
            return null;

        var yrs = (dt & 0x7f) + 2000;
        var days = (dt & 0xf80) >> 7;
        var month = (dt & 0xF000) >> 12;        

        var mdt = yrs.toString() + ' ' + VpBase.pad(month, 2) + ' ' + VpBase.pad(days, 2);
        
        mdt = moment(mdt, 'YYYY MM DD').format('MM/DD/YYYY');

        return mdt;
    }  

    static pad(num:number, size:number):string {
        var s = "000000000" + num;
        return s.substr(s.length - size);
    }

    static timeDiff(dt: Date, type: string): number {
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
    }

    static getDateTimeStamp(dt: string) : any {
      
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
    }

    static uint16(n) {
        return n & 0xFFFF;
    }
 
}


