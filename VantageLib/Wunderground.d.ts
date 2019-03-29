import Database from './Database';
import WeatherAlert from './WeatherAlert';
import { VPCurrent } from './VPCurrent';
import ClientSocket from './ClientSocket';
export default class Wunderground {
    config: any;
    database: Database;
    socket: ClientSocket;
    constructor(socket: any);
    getAlerts(): Promise<WeatherAlert[]>;
    upload(current: VPCurrent): void;
    static getForecast(config: any): Promise<any>;
    updateFromArchive(): Promise<{}>;
}
//# sourceMappingURL=Wunderground.d.ts.map