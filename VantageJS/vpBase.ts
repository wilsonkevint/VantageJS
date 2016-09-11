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

        return hrs + ":" + mins;
    }

    peek(offset) :number {
        return this._data[this.dataIndx + offset];
    }

    static round(value, precision) :number {
        var multiplier = Math.pow(10, precision || 0);
        return Math.round(value * multiplier) / multiplier;
    }

    temperature() : number {
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

    rain(): number {
        var rain = this.nextDecimal();
        if (rain == 65535)
            rain = 0;

        return vpBase.round(rain, 2) / 100;
    }

    static date(dt: number): Date {
               
        if (dt == 65535 || dt == 0)
            return null;

        var yrs = (dt & 0x7f) + 2000;
        var days = (dt & 0xf80) >> 7;
        var month = (dt & 0xF000) >> 12;

        return new Date(yrs, month, days);
    }  


}