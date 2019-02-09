export declare class Util {
    static padZero(num: number, len: number): string | number;
    static round(nbr: any, decimals: any): number;
}
export declare class Logger {
    static winston: any;
    static init(filename: string): void;
    static info(...args: any[]): void;
    static warn(...args: any[]): void;
    static error(...args: any[]): void;
    static debug(...args: any[]): void;
}
//# sourceMappingURL=Common.d.ts.map