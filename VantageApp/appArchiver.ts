﻿// appArchiver - reads archive records from Vantage Vue and writes to database
import Archiver from '../VantageLib/Archiver';
import * as Common from '../VantageLib/Common';
const moment = require('moment');
const config = require('../VantageLib/VantageJS.json');

Common.Logger.init('archiver.log');
Common.Logger.info('started');
const archiver = new Archiver();
const dbUpdateInterval = config.dbUpdateInterval * 60 * 1000; 

setInterval(async () => {
    await archiver.update().catch(err => {
        Common.Logger.error(err);
    });
}, dbUpdateInterval); 

archiver.update().then(() => {
    Common.Logger.info('finished');
}).catch(err => {
    Common.Logger.error(err);
});
// original comment 3.29

//comment 3/29



