import DeviceReader from './DeviceReader';
import ClientSocket from './ClientSocket';
export default class VantageVue {
    current: any;
    hilows: any;
    vp1current: any;
    device: DeviceReader;
    socket: ClientSocket;
    config: any;
    server: any;
    forecast: any;
    constructor();
    start(): void;
    requestReceived(req: any, res: any): void;
    getForecast(): Promise<any>;
}
//# sourceMappingURL=VantageVue.d.ts.map