export default class Database {
    config: any;
    db: any;
    constructor();
    connect(): Promise<{}>;
    find(collname: any, criteria: any): any;
    sort(collname: any, criteria: any, sortby: any): any;
    insert(collname: any, obj: any): Promise<any>;
    delete(collname: any, obj: any): any;
    sum(collname: any, fld: any, criteria: any, fn: any): any;
    groupSum(collname: any, fld: any, groupBy: any, criteria: any, fn: any, sortOrder?: string): any;
    update(collname: any, obj: any, upsert: boolean): any;
    getLast(collname: any): any;
    getFirst(collname: any): any;
    getLastRecs(collname: any, recs: any): any;
}
//# sourceMappingURL=Database.d.ts.map