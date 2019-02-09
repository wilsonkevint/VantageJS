declare function require(name: string);
import * as Common from '../VantageLib/Common';  
import VPBase from '../VantageLib/VPBase';
import VPArchive from '../VantageLib/VPArchive';
import VPCurrent from '../VantageLib/VPCurrent';
import VPHiLow from '../VantageLib/VPHiLow';
import { setInterval, clearInterval } from 'timers';
const SerialPort = require("serialport");
 
export default class DeviceReader {
    config: any;
    port: any;
    isBusy: boolean;    
    pauseTimer: any;
    lastLoop: any;
    dataReceived: any;
    errorReceived: any;
    loopTimer: any;    
    hiLowTimer: any;
    currentReceived: any;
    hilowReceived: any;
    current: VPCurrent;
    hilows: VPHiLow;
   
    public constructor(config: any) {

        this.config = config;

        try {
            this.port = new SerialPort(config.comPort, {
                baudRate: 19200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                parser: SerialPort.parsers.raw
            });
        }
        catch (e) {
            Common.Logger.error('DeviceReader:' + e);
        }

        this.port.on('open', data => {
            Common.Logger.info('comport open');
        });

        this.port.on('close', () => {
            Common.Logger.info('comport closed');
        });

        this.port.on('error', err => {
            this.isBusy = false;
            this.errorReceived && this.errorReceived(err);
            Common.Logger.error(err.message);
        });

        this.port.on('data', (data: Uint8Array) => {
            this.dataReceived && this.dataReceived(data);
        });

        console.log('loopInterval:' + this.config.hilowInterval);
        console.log('hilowInterval:' + this.config.hilowInterval)
    }

    getSerial(cmd: any, reqchars: number, expectAck: boolean): Promise<Uint8Array> {

        let promise = new Promise<Uint8Array>((resolve, reject) => {
            let received = [];
            this.isBusy = true;

            this.dataReceived = (data) => {                
                if (expectAck) {
                    if (data[0] == 6) {
                        expectAck = false;

                        if (data.length > 1) {
                            received.push.apply(received, data.slice(1));
                        }
                        else {
                            if (reqchars == 1)
                                received = [6];
                        }
                    }
                    else {
                        this.isBusy = false;
                        reject(data);
                    }
                }
                else {
                    received.push.apply(received, data);
                }

                if (received.length >= reqchars) {
                    this.isBusy = false;
                    resolve(new Uint8Array(received));
                }
            }

            this.errorReceived = err => {
                this.isBusy = false;
                reject(err);
            }

            if (typeof cmd == 'string')
                this.port.write(cmd + '\n');
            else {
                let buffer = new Uint8Array(cmd);
                this.port.write(buffer);
            }

        });

        return promise;
    }

    async getHiLows(): Promise<any> {
        console.log('getHiLows');
        let promise = new Promise((resolve, reject) => {            
            this.isAvailable().then(() => {

                this.wakeUp().then(result => {

                    this.getSerial("HILOWS", 438, true).then(data => {
                        if (DeviceReader.validateCRC(data, 0)) {
                            this.hilows = new VPHiLow(data);
                            this.hilowReceived();
                            console.log('got hilows');
                            resolve();
                        }

                    }).catch(err => { Common.Logger.error(err); reject(); });
                }).catch(err => { Common.Logger.error(err); reject(); });

            }, err => {
                Common.Logger.error('hilows device not available');
                reject();
            });
        });

        return promise;


    }

    async isAvailable(): Promise<boolean> {
        let wtimer;

        let promise = new Promise<boolean>((resolve, reject) => {
            if (!this.isBusy) {
                resolve(true);
            }
            else {
                let attempts = 0;

                wtimer = setInterval(() => {
                    if (!this.isBusy) {
                        clearInterval(wtimer);
                        resolve(true);
                    }

                    attempts++;

                    if (attempts > 60) {            //60 attempts @500ms = 30 secs
                        clearInterval(wtimer);
                        this.isBusy = false;
                        resolve(true);
                    }
                }, 500);
            }
        });

        return promise;
    }

    pauseLoop(secs) {      
        this.pauseTimer = setTimeout(() => {
            this.pauseTimer = 0;            
        }, secs * 1000);
    }

    async start() {
        this.pauseTimer = 0; 

        try {
            await this.setTime();            
        }
        catch (err) {
            Common.Logger.error(err);
            throw err;
        }

        try {
            await this.getHiLows();
        }
        catch {           
        }

        this.startLoop();   

        this.loopTimer = setInterval(() => {

            this.startLoop();

        }, this.config.loopInterval);

        this.hiLowTimer = setInterval(async () => {
            try {                
                this.pauseLoop(180);
                await this.getHiLows();
                this.pauseTimer = 0;
            }
            catch (err) {
                this.pauseTimer = 0;
                Common.Logger.error(err);
            }
           
        }, this.config.hilowInterval);               
    }

    startLoop() {
        //console.log('startLoop');

        if (this.pauseTimer === 0) {

            if (this.current == null || VPBase.timeDiff(this.current.dateLoaded, 's') > 6) {
                //console.log('startLoop1');

                this.isAvailable().then(() => {
                    console.log('startLoop2');                  

                    this.wakeUp().then(() => {
                        this.dataReceived = this.gotLoop;
                        this.port.write('LOOP ' + this.config.loopCount.toString() + '\n');
                    }).catch ()

                }).catch(err => {
                    Common.Logger.error(err);
                });
            }
        }
        else {
            console.log('pauseTimer on');
        }

    }

    gotLoop(data) {
        console.log('got loop');
        this.lastLoop = new Date();
        if (this.validateLoop(data)) {
            this.current = new VPCurrent(data);
            //console.log('gotLoop current:', this.current.temperature);
            this.currentReceived();
        }
    }

    async setTime() {

        let result: boolean;
        var data = [6];
        var now = new Date();
        data[0] = now.getSeconds();
        data[1] = now.getMinutes();
        data[2] = now.getHours();
        data[3] = now.getDate();
        data[4] = now.getMonth() + 1;
        data[5] = now.getFullYear() - 1900;
        var crc = DeviceReader.getCRC(data);
        Array.prototype.push.apply(data, crc);

        let tdata = await this.sendCommand("SETTIME", true);
        if (tdata[0] == 6) {
            let setresult = await this.getSerial(data, 1, true);
            if (setresult[0] == 6) {
                Common.Logger.info('time successfully changed');       
                result = true;
            }
        }
        else {
            Common.Logger.info('time successfully not changed');
            result = false;
        }

        return result;

        
 
    }

    async sendCommand(cmd, binres?: boolean) {
        let result: any = '';

        this.pauseLoop(2);
        await this.isAvailable();
        await this.wakeUp();
        let data = await this.getSerial(cmd + '\n', 1, false);
        this.pauseTimer = 0;
        if (!binres) {
            for (var i in data) {
                result += String.fromCharCode(data[i]);
            }
        }
        else {
            result = data;
        }

        return result;
    }

    async wakeUp(): Promise<boolean> {
        let attempts = 0;

        let promise = new Promise<boolean>((resolve, reject) => {
            this.isBusy = true;
            let received = 0;
            let waitintv;

            this.dataReceived = (data) => {
                received = data.length;

                if (data.length == 99) {
                    //console.log('wakeup got LOOP data');                   
                }
                else {
                    if (data && received == 2 && data[0] == 10 && data[1] == 13) {
                        this.isBusy = false;
                        clearInterval(waitintv);
                        resolve(true);
                    }
                    else {
                        if (attempts > 2) {
                            this.isBusy = false;
                            clearInterval(waitintv);
                            reject(false);                           
                        }
                        else
                            setTimeout(() => {
                                this.port.write('\n');
                            }, 2000);

                        attempts++;
                    }
                }

            }

            this.errorReceived = err => {
                this.isBusy = false;
                clearInterval(waitintv);
                console.log(err);
                reject('errorRec:' + err);
            }

            this.port.write('\n');              //send wakeup

            waitintv = setInterval(() => {
                if (received == 0) {
                    attempts++;
                    if (attempts < 2) {
                        console.log('retrying wakeup')
                        this.port.write('\n');
                    }
                    else {
                        clearInterval(waitintv);
                        this.isBusy = false;
                        console.log('wakeup failed');
                        reject(false);
                    }
                }
            }, 10000);

        });

        return promise;
    }     

    async getArchives(startDate: string): Promise<any> {
        let archives;
        let cmd = startDate != null ? 'DMPAFT' : 'DMP';

        try {
            let result = await this.sendArchiveCmd(cmd);

            if (startDate) {
                let ts = DeviceReader.getArchiveTS(startDate);
                result = await this.getSerial(ts, 6, true);
            }

            archives = await this.retrieveArchive(result, false);
        }
        catch (err) {
            Common.Logger.error(err);
            archives = null;
        }
        return archives;
    }       

    static getArchiveTS(startDate: string) {
        let stamp = VPBase.getDateTimeStamp(startDate);
        let crcTS = DeviceReader.getCRC(stamp);
        let buffer = [];

        Array.prototype.push.apply(buffer, stamp);
        Array.prototype.push.apply(buffer, crcTS);

        return buffer;
    }

    async retrieveArchive(buffer: any, allPages) {

        let promise = new Promise<Array<VPArchive>>((resolve, reject) => {

            let base = new VPBase(new Uint8Array(buffer));
            let pgCount;
            let firstRecord;
            let pgIndex = 0;
            let archives = [];
            let received = [];

            pgCount = base.nextDecimal();
            pgCount = allPages ? 511 : pgCount;
            firstRecord = base.nextDecimal();

            Common.Logger.info('archive retrieving ' + pgCount + ' pages');

            this.port.write([6]);       //acknowledge- start download

            if (pgCount == 0) {
                resolve(archives);
                return;
            }

            this.dataReceived = (data) => {               
                if (received.length < 267)
                    received.push.apply(received, data);

                if (received.length == 267) {
                    let dataIndx = 0;

                    if (DeviceReader.getCRC(received)) {

                        pgIndex++;

                        if (pgIndex == 15) {
                            let x = 1;
                        }

                        for (let i = 0; i < 5; i++) {
                            let archrec = new VPArchive(new Uint8Array(received), dataIndx);
                            if (archrec.archiveDate)
                                archives.push(archrec);
                            dataIndx += 52;
                        }

                        received = [];

                        Common.Logger.info('retrieved page ' + pgIndex + ' of ' + pgCount);

                        if (pgIndex == pgCount) {
                            resolve(archives);
                        }
                        else {
                            this.port.write([6]);
                        }

                    }
                    else {
                        this.port.write(0x21);                  //crc error.. request send again
                    }

                }
            }
        });
    }

    async sendArchiveCmd(cmd) {
        try {
            await this.isAvailable();
            await this.wakeUp();
            return await this.getSerial(cmd, 1, true);
        }
        catch (err) {
            Common.Logger.error(err);
            throw err;
        }
    }


    validateLoop(data) {

        let startx = data.length == 99 ? 0 : 1;
        if (DeviceReader.validateCRC(data, startx)) {
            return true;
        }
        else {
            return false;
        }
    }


    static validateCRC(data: Uint8Array, start): boolean {
        let crcNum = 0;

        for (let i = start; i < data.length; i++) {
            let indx = (crcNum >> 8) ^ data[i];
            crcNum = VPBase.uint16((crcNum << 8) ^ DeviceReader.crc_table[indx]);
        }
        return crcNum == 0;
    }

    static getCRC(data): any {
        let crcNum = 0;

        for (let i = 0; i < data.length; i++) {
            let d = data[i];
            let indx = (crcNum >> 8) ^ d;
            crcNum = VPBase.uint16((crcNum << 8) ^ DeviceReader.crc_table[indx]);
        }

        let byte2 = VPBase.uint16(crcNum / 256);
        let byte1 = VPBase.uint16(crcNum - byte2 * 256);

        return [byte2, byte1];
    }       

    static crc_table = [
        0x0, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
        0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
        0x1231, 0x210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
        0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
        0x2462, 0x3443, 0x420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
        0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
        0x3653, 0x2672, 0x1611, 0x630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
        0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
        0x48c4, 0x58e5, 0x6886, 0x78a7, 0x840, 0x1861, 0x2802, 0x3823,
        0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
        0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0xa50, 0x3a33, 0x2a12,
        0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
        0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0xc60, 0x1c41,
        0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
        0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0xe70,
        0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
        0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
        0x1080, 0xa1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
        0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
        0x2b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
        0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
        0x34e2, 0x24c3, 0x14a0, 0x481, 0x7466, 0x6447, 0x5424, 0x4405,
        0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
        0x26d3, 0x36f2, 0x691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
        0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
        0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x8e1, 0x3882, 0x28a3,
        0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
        0x4a75, 0x5a54, 0x6a37, 0x7a16, 0xaf1, 0x1ad0, 0x2ab3, 0x3a92,
        0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
        0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0xcc1,
        0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
        0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0xed1, 0x1ef0
    ];                     
 
}