import vpBase from './vpBase';

export default class vpHiLow extends vpBase {
    constructor(data: Uint8Array) {
        super(data);
        this.dataIndx = 0;

        this.barometer = this.fBarometerHL();
        this.windSpeed = this.fWindSpeed();
        this.inTemperature = this.fTemperatureHL(false);
        this.inHumidity = this.fHumidity(false);
        this.outTemperature = this.fTemperatureHL(true);
        this.dewpoint = this.fDewPoint();
        this.windChill = this.fWindChill();
        this.heatIndex = this.fHeatIndex();
        this.thswIndex = this.fHeatIndex();
        this.radiation = this.fHeatIndex();
        this.uvHigh = this.fUVHigh();

        this.rainHigh = this.fRainHL(); 

        this.dataIndx += 150;                       //extra/leaf/soil

        this.outHumidity = this.fHumidity(true);  

        this._data = null;
    }


    barometer: hiLow
    windSpeed: hiLow;
    inTemperature: hiLow;
    inHumidity: hiLow;
    outTemperature: hiLow;
    dewpoint: hiLow;
    windChill: hiLow;
    heatIndex: hiLow;
    thswIndex: hiLow;
    radiation: hiLow;
    uvHigh: hiLow;
    rainHigh: hiLow;
    outHumidity: hiLow;
    dateLoaded: string;

    fBarometerHL(): hiLow {
        var hilow = new hiLow();
        hilow.dailyLow = vpBase.round(this.nextDecimal() / 1000, 2);
        hilow.dailyHi = vpBase.round(this.nextDecimal() / 1000, 2);
        hilow.monthLow = vpBase.round(this.nextDecimal() / 1000, 2);
        hilow.monthHi = vpBase.round(this.nextDecimal() / 1000, 2);
        hilow.yearLow = vpBase.round(this.nextDecimal() / 1000, 2); 
        hilow.yearHi = vpBase.round(this.nextDecimal() / 1000, 2); 

        hilow.dailyLowTime = this.nextTime();
        hilow.dailyHighTime = this.nextTime();

        return hilow;
    }

    fWindSpeed(): hiLow {
        var hilow = new hiLow();

        hilow.dailyHi = this.nextByte();
        hilow.dailyHighTime = this.nextTime();
      
        hilow.monthHi = this.nextByte();    
        hilow.yearHi = this.nextByte();
     
        return hilow;
    }

    fTemperatureHL(outside: boolean): hiLow {
        var hilow = new hiLow();

        //the sequence of low high is reversed inside vs outside (blame Davis developer)
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

    fHumidity(outside: boolean) {
        var hilow = new hiLow();

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

    fDewPoint(): hiLow {
        var hilow = new hiLow();

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

    fWindChill(): hiLow {
        var low = new hiLow();

        low.dailyLow = this.nextDecimal();
        low.dailyLowTime = this.nextTime();

        low.monthLow = this.nextDecimal();
        low.yearLow = this.nextDecimal();

        return low;
    }

    fHeatIndex(): hiLow {
        var hi = new hiLow();

        hi.dailyHi = this.nextDecimal();
        hi.dailyHighTime = this.nextTime();

        hi.monthHi = this.nextDecimal();
        hi.yearHi = this.nextDecimal();

        return hi;
    }

    fRainHL(): hiLow {
        var hi = new hiLow();
        hi.dailyHi = this.nextDecimal() / 100;
        hi.dailyHighTime = this.nextTime();

        hi.hourlyHi = this.nextDecimal() / 100;
        hi.monthHi = this.nextDecimal() / 100;
        hi.yearHi = this.nextDecimal() / 100;

        return hi;
    }

    fUVHigh(): hiLow {
        var hi = new hiLow();
        hi.dailyHi = this.nextByte();
        hi.dailyHighTime = this.nextTime();
        hi.monthHi = this.nextByte();
        hi.yearHi = this.nextByte();
        return hi;
    }
}


class hiLow {
    hourlyHi;
    dailyLow;
    dailyHi;
    monthLow;
    monthHi;
    yearLow;
    yearHi;
    dailyLowTime;
    dailyHighTime;
}