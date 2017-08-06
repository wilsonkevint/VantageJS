import VPBase from './VPBase';

export default class VPCurrent extends VPBase {

    constructor(data: Uint8Array) {
        super(data);
        if (data == null)
            return;

        this.dataIndx = 3;  
        if (data[0] == 6)
            this.dataIndx++;
       
        this.barometerTrend = this.fBarometerTrend();

        this.dataIndx += 3;

        this.barometer = this.fBarometer();
        this.inTemperature = this.fTemperature();
        this.inHumidity = this.nextByte();
        this.temperature = this.fTemperature();
        this.windSpeed = this.nextByte();
        this.windAvg = this.nextByte();
        this.windDir = this.nextDecimal();
        this.windDirection = this.fWindDirection(this.windDir);

        this.dataIndx += 15;

        this.humidity = this.nextByte();
        this.dewpoint = VPCurrent.fDewpoint(this.temperature, this.humidity);

        this.dataIndx += 7;

        this.rainRate = this.fRain();

        this.dataIndx += 3;

        this.stormRain = this.fRain();
        this.stormDate = this.fStormDate();
        this.dayRain = this.fRain();
        this.monthRain = this.fRain();
        this.yearRain = this.fRain();

        this.dataIndx += 30;

        this.battery = this.nextByte();
        this.voltage = this.nextDecimal();
        this.forecastIcon = this.fForecastIcon();
        this.forecastRule = this.nextByte();
        this.sunrise = this.nextTime();
        this.sunset = this.nextTime();
        this.dateLoaded = new Date();

        this._data = null;
    }

    barometerTrend: string;
    barometer: number;
    inTemperature: number;
    inHumidity: number;
    temperature: number;
    windSpeed: number;
    windAvg: number;
    windDir: number;
    windDirection: string;
    humidity: number;
    dewpoint: number;
    rainRate: number;   
    stormRain: number;
    stormDate: string;
    dayRain: number;
    monthRain: number;
    yearRain: number;
    battery: number;
    voltage: number;
    forecastIcon: string;
    forecastRule: number;
    sunrise: string;
    sunset: string;
    dateLoaded: Date;
    wuUpdated: any;


    fBarometerTrend(): string {
        var trend = this.nextByte();
        var Trend;
        switch (trend) {
            case 196:
                Trend = "Falling Rapidly";
                break;
            case 236:
                Trend = "Falling Slowly";
                break;
            case 0:
                Trend = "Steady";
                break;
            case 20:
                Trend = "Rising Slowly";
                break;
            case 60:
                Trend = "Rising Rapidly";
                break;
            default:
                Trend = "?";
                break;
        }

        return Trend;
    }    

    fWindDirection(degrees): string {
        var directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW", "N"];

        var dirindx = Math.round((degrees / 360 * 16));
        if (dirindx < directions.length)
            return directions[dirindx];
        else
            return "";
    }


    static fDewpoint(temperature: number, rh: number): number {
        var dewPt = 0;

        try {
            var tem = -1.0 * temperature;
            var es = 6.112 * Math.exp(-1.0 * 17.67 * tem / (243.5 - tem));
            var ed = rh / 100.0 * es;
            var eln = Math.log(ed / 6.112);
            dewPt = -243.5 * eln / (eln - 17.67);
        }
        catch (ex) {
            console.log("getDewpoint:" + ex);
        }

        return Math.round(dewPt * 100) / 100;
    }

    fStormDate(): string {
        return VPBase.date(this.nextDecimal());
    }

    fForecastIcon(): string {
        var forecast = "";
        var rainIcon = 1;
        var cloudyIcon = 2;
        var pCloudyIcon = 4;
        var sunIcon = 8;
        var snowIcon = 16;

        var forecastNum = this.nextByte();

        switch (forecastNum) {
            case 3:
                forecast = "/weather/forecastimages/rain.gif";
                break;
            case 6:
                forecast = "/weather/forecastimages/partlycloudy.gif";
                break;
            case 7:
                forecast = "/weather/forecastimages/partlycloudyandrain.gif";
                break;
            case 18:
                forecast = "/weather/forecastimages/snow.gif";
                break;
            case 19:
                forecast = "/weather/forecastimages/snowandrain.gif";
                break;
            case 22:
                forecast = "/weather/forecastimages/partlycloudyandsnow.gif";
                break;
            case 23:
                forecast = "/weather/forecastimages/partlycloudyandsnow.gif";
                break;
            case sunIcon:
                forecast = "/weather/forecastimages/sunny.gif";
                break;
            case snowIcon:
                forecast = "/weather/forecastimages/snow.gif";
                break;
            case pCloudyIcon:
                forecast = "/weather/forecastimages/partlycloudy.gif";
                break;
            case cloudyIcon:
                forecast = "/weather/forecastimages/cloudy.gif";
                break;
            case rainIcon:
                forecast = "/weather/forecastimages/rain.gif";
                break;
            default:
                break;
        }

        return forecast;
    }
       
}




//class baseVP {
//    private _data: Uint8Array;

//    constructor(data: Uint8Array) {
//        this._data = data;
//    }

//    dataIndx: number;

//    nextByte(): number {
//        var val = this._data[this.dataIndx];
//        this.dataIndx += 1;
//        return val;
//    }

//    nextDecimal(): number {
//        var byte1 = this.nextByte();
//        var byte2 = this.nextByte();

//        return byte2 * 256 + byte1;
//    }

//    nextTime(): string {
//        var time = this.nextDecimal();
//        var tm;

//        if (time != 65535) {
//            if (time > 2359)
//                time = time / 100;

//            var hrs = Math.floor(time / 100);
//            var mins = Math.floor((time / 100 - hrs) * 100);
//        }
//        else
//            return "";

//        return hrs + ":" + mins;
//    }

//    peek(offset): number {
//        return this._data[this.dataIndx + offset];
//    }

//    static round(value, precision): number {
//        var multiplier = Math.pow(10, precision || 0);
//        return Math.round(value * multiplier) / multiplier;
//    }

//    fTemperature(): number {
//        var temp1 = this.peek(0);
//        var temp2 = this.peek(1);

//        var temp = this.nextDecimal();

//        if (temp2 == 255)
//            temp = -(255 - temp1);

//        try {
//            temp = VPBase.round(temp, 2) / 10;
//        }
//        catch (x) {
//        }

//        return temp;
//    }

//    fRain(): number {
//        var rain = this.nextDecimal();
//        if (rain == 65535)
//            rain = 0;

//        return VPBase.round(rain, 2);
//    }

//    static date(dt: number): Date {

//        if (dt == 65535 || dt == 0)
//            return null;

//        var yrs = (dt & 0x7f) + 2000;
//        var days = (dt & 0xf80) >> 7;
//        var month = (dt & 0xF000) >> 12;

//        return new Date(yrs, month, days);
//    }


//}

