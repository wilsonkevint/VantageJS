export default class ClientSocket {
    config: any;
    socket: any;
    eventEmitter: any;
    constructor();
    start(): void;
    startAsync(): Promise<{}>;
    timer: any;
    getSocket(connectCB?: any, errorCB?: any): void;
    reconnect(): void;
    emitEvent(name: string, obj: any): void;
    socketEmit(name: string, obj: any): void;
    send(obj: any): void;
    subscribeCurrent(listener: any): void;
    subscribeHiLow(listener: any): void;
    subscribeAlert(listener: any): void;
    subscribeHistory(listener: any): void;
    subscribe(eventName: string, listener: any): void;
}
//# sourceMappingURL=ClientSocket.d.ts.map