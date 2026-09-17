export interface LedgerResult<T=unknown>{results:T[];meta:{changes:number}}
export interface LedgerStatement{
 bind(...values:any[]):LedgerStatement;
 first<T=unknown>():Promise<T|null>;
 all<T=unknown>():Promise<LedgerResult<T>>;
 run():Promise<LedgerResult>;
}
export interface LedgerDatabase{
 prepare(sql:string):LedgerStatement;
 batch(statements:LedgerStatement[]):Promise<LedgerResult[]>;
}
