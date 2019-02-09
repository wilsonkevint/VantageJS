import Database from './Database';
export default class QueryEngine {
    config: any;
    database: Database;
    connected: boolean;
    constructor(database?: any);
    connectDB(): Promise<{}>;
    getArchivesDB(startDate: any, period: any): Promise<{}>;
    getArchivesSum(startDate: any, period: any, sortOrder?: string): Promise<{}>;
    getRainTotals(dt: any): Promise<any>;
    archiveGroupBy(archives: any, groupBy: any, column: any): any;
    queryArchives(key: any, group: any): {
        date: any;
        min: any;
        max: any;
        count: any;
        avg: any;
    };
}
//# sourceMappingURL=QueryEngine.d.ts.map