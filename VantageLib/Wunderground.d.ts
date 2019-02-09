import Database from './Database';
import VPCurrent from './VPCurrent';
export default class Wunderground {
    config: any;
    database: Database;
    constructor();
    getAlerts(): Promise<any>;
    upload(current: VPCurrent): void;
    getForecast(): any;
    updateFromArchive(): Promise<{}>;
}
//# sourceMappingURL=Wunderground.d.ts.map