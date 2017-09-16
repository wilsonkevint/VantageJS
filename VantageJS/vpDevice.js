"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process = require('process');
const moment = require('moment');
const SerialPort = require("serialport");
const VPBase_1 = require("./VPBase");
const VPArchive_1 = require("./VPArchive");
const Common = require("./Common");
class VPDevice {
    constructor(comPort) {
        this.portName = comPort;
        try {
            this.port = new SerialPort(comPort, {
                baudRate: 19200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                parser: SerialPort.parsers.raw
            });
        }
        catch (e) {
            Common.Logger.error('VPDevice:' + e);
            //process.exit(-1);
        }
        this.port.on('open', data => {
            if (this.onOpen)
                this.onOpen();
            Common.Logger.info('comport open');
        });
        this.port.on('close', () => {
            Common.Logger.info('comport closed');
        });
        this.port.on('error', err => {
            this.errorReceived(err);
            Common.Logger.error(err.message);
            //process.exit(-1);
        });
        this.port.on('data', (data) => {
            this.serialData = data;
            if (this.dataReceived)
                this.dataReceived();
        });
    }
    errorReceived(err) {
        VPDevice.isBusy = false;
    }
    writeLoop(loops, callback) {
        this.dataReceived = callback;
        this.port.write('LOOP ' + loops.toString() + '\n');
    }
    getSerial(cmd, reqchars, expectAck) {
        var promise = new Promise((resolve, reject) => {
            var received = [];
            VPDevice.isBusy = true;
            this.dataReceived = () => {
                var data = this.serialData;
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
                        VPDevice.isBusy = false;
                        reject(data);
                    }
                }
                else {
                    received.push.apply(received, data);
                }
                if (received.length >= reqchars) {
                    VPDevice.isBusy = false;
                    resolve(received);
                }
            };
            this.errorReceived = err => {
                VPDevice.isBusy = false;
                reject(err);
            };
            if (typeof cmd == 'string')
                this.port.write(cmd + '\n');
            else {
                var buffer = new Uint8Array(cmd);
                this.port.write(buffer);
            }
        });
        return promise;
    }
    getArchived(startDate) {
        var archives;
        var cmd = startDate != null ? 'DMPAFT' : 'DMP';
        var promise = new Promise((resolve, reject) => {
            this.sendArchiveCmd(cmd).then(result => {
                if (cmd == 'DMPAFT') {
                    var ts = VPDevice.getArchiveTS(startDate);
                    this.getSerial(ts, 6, true).then(data => {
                        this.retrieveArchive(data, false, (archives) => {
                            resolve(archives);
                        });
                    }, err => {
                        reject();
                        Common.Logger.error('getArchived error');
                    });
                }
                else {
                    this.retrieveArchive(result, true, (archives) => {
                        resolve(archives);
                    });
                }
            });
        });
        return promise;
    }
    sendArchiveCmd(cmd) {
        return new Promise((resolve, reject) => {
            var rj = err => {
                Common.Logger.error(err);
                reject(err);
            };
            this.isAvailable().then(() => {
                this.wakeUp().then(result => {
                    this.getSerial(cmd, 1, true).then(data => {
                        resolve(data);
                    }, rj);
                }, rj);
            }, rj);
        });
    }
    static getArchiveTS(startDate) {
        var stamp = VPBase_1.default.getDateTimeStamp(startDate);
        var crcTS = VPDevice.getCRC(stamp);
        var buffer = [];
        Array.prototype.push.apply(buffer, stamp);
        Array.prototype.push.apply(buffer, crcTS);
        return buffer;
    }
    retrieveArchive(buffer, allPages, callback) {
        var base = new VPBase_1.default(new Uint8Array(buffer));
        var pgCount;
        var firstRecord;
        var pgIndex = 0;
        var archives = [];
        var received = [];
        pgCount = base.nextDecimal();
        pgCount = allPages ? 511 : pgCount;
        firstRecord = base.nextDecimal();
        Common.Logger.info('archive retrieving ' + pgCount + ' pages');
        this.port.write([6]); //acknowledge- start download
        if (pgCount == 0) {
            callback(archives);
            return;
        }
        this.dataReceived = () => {
            var data = this.serialData;
            if (received.length < 267)
                received.push.apply(received, data);
            if (received.length == 267) {
                var dataIndx = 0;
                if (VPDevice.getCRC(received)) {
                    pgIndex++;
                    if (pgIndex == 15) {
                        var x = 1;
                    }
                    for (var i = 0; i < 5; i++) {
                        var archrec = new VPArchive_1.default(new Uint8Array(received), dataIndx);
                        if (archrec.archiveDate)
                            archives.push(archrec);
                        dataIndx += 52;
                    }
                    received = [];
                    Common.Logger.info('retrieved page ' + pgIndex + ' of ' + pgCount);
                    if (pgIndex == pgCount) {
                        callback(archives);
                    }
                    else {
                        this.port.write([6]);
                    }
                }
                else {
                    this.port.write(0x21); //crc error.. request send again
                }
            }
        };
    }
    static validateCRC(data, start) {
        var crcNum = 0;
        for (var i = start; i < data.length; i++) {
            var indx = (crcNum >> 8) ^ data[i];
            crcNum = VPBase_1.default.uint16((crcNum << 8) ^ VPDevice.crc_table[indx]);
        }
        return crcNum == 0;
    }
    static getCRC(data) {
        var crcNum = 0;
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
            var indx = (crcNum >> 8) ^ d;
            crcNum = VPBase_1.default.uint16((crcNum << 8) ^ VPDevice.crc_table[indx]);
        }
        var byte2 = VPBase_1.default.uint16(crcNum / 256);
        var byte1 = VPBase_1.default.uint16(crcNum - byte2 * 256);
        return [byte2, byte1];
    }
    wakeUp() {
        var attempts = 0;
        var promise = new Promise((resolve, reject) => {
            VPDevice.isBusy = true;
            this.dataReceived = () => {
                var data = this.serialData;
                if (data.length == 99) {
                    console.log('wakeup got LOOP data');
                }
                else {
                    if (data && data.length == 2 && data[0] == 10 && data[1] == 13) {
                        VPDevice.isBusy = false;
                        this.lastActv = Date();
                        resolve(true);
                    }
                    else {
                        if (attempts > 2) {
                            VPDevice.isBusy = false;
                            reject(false);
                        }
                        else
                            setTimeout(() => {
                                this.port.write('\n');
                            }, 2000);
                        attempts++;
                    }
                }
            };
            this.errorReceived = err => {
                VPDevice.isBusy = false;
                reject(err);
            };
            this.port.write('\n');
        });
        return promise;
    }
    isAvailable() {
        var wtimer;
        var promise = new Promise((resolve, reject) => {
            if (!VPDevice.isBusy) {
                resolve();
            }
            else {
                var attempts = 0;
                wtimer = setInterval(() => {
                    if (!VPDevice.isBusy) {
                        clearInterval(wtimer);
                        resolve();
                    }
                    attempts++;
                    if (attempts > 60) {
                        clearInterval(wtimer);
                        VPDevice.isBusy = false;
                        reject();
                    }
                }, 500);
            }
        });
        return promise;
    }
}
VPDevice.crc_table = [
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
exports.default = VPDevice;
//# sourceMappingURL=VPDevice.js.map