export default class ClientSocket {
    config: any;
    socket: any;
    eventEmitter: any;
    client: string;
    constructor(client?: string);
    start(): void;
    getSocket(): void;
    emitEvent(name: string, obj: any): void;
    socketEmit(name: string, obj: any): void;
    subscribeCurrent(listener: any): void;
    subscribeHiLow(listener: any): void;
    subscribeAlert(listener: any): void;
    subscribeHistory(listener: any): void;
    subscribe(eventName: string, listener: any): void;
}
//# sourceMappingURL=ClientSocket.d.ts.map