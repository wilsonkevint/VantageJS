declare function require(name: string);
var moment = require('moment');

export default class vpBase {
    _data: Uint8Array;
    dataIndx: number;

    public constructor(data: Uint8Array) {
        this._data = data;
    }

    nextByte() :number {
        var val = this._data[this.dataIndx];
        this.dataIndx += 1;
        return val;
    }

    nextDateTime(): Date {
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

    }

    nextDecimal() :number {
        var byte1 = this.nextByte();
        var byte2 = this.nextByte();

        return byte2 * 256 + byte1;
    }

    nextTime() :string {
        var time = this.nextDecimal();
        var tm;

        if (time != 65535) {
            var hrs = Math.floor(time / 100);
            var mins = Math.floor((time / 100 - hrs) * 100);
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

        return vpBase.round(barom, 2);
    }

    fTemperature() : number {
        var temp1 = this.peek(0);
        var temp2 = this.peek(1);

        var temp = this.nextDecimal();

        if (temp2 == 255)
            temp = -(255 - temp1);

        try {
            temp = vpBase.round(temp,2) / 10;
        }
        catch (x) {
        }

        return temp;
    }

    fRain(): number {
        var rain = this.nextDecimal();
        if (rain == 65535)
            rain = 0;

        return vpBase.round(rain, 2) / 100;
    }

    static date(dt: number): string {
               
        if (dt == 65535 || dt == 0)
            return null;

        var yrs = (dt & 0x7f) + 2000;
        var days = (dt & 0xf80) >> 7;
        var month = (dt & 0xF000) >> 12;        

        var mdt = yrs.toString() + ' ' + vpBase.pad(month, 2) + ' ' + vpBase.pad(days, 2);
        
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

    static getDateTimeStamp(dt: any) : any {
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
    }
 
}


