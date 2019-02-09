import Archiver from '../VantageLib/Archiver';
import * as Common from '../VantageLib/Common';
const moment = require('moment');
const config = require('../VantageLib/VantageJS.json');

Common.Logger.init('archiver.log');
Common.Logger.info('started');
const archiver = new Archiver();
const dbUpdateInterval = config.dbUpdateInterval * 60 * 1000; 

setInterval(async () => {
    await archiver.update();
}, dbUpdateInterval); 

archiver.update().then(() => { })


