import { createClient,type Client,type InValue,type ResultSet } from '@libsql/client';
import type { LedgerDatabase,LedgerStatement,LedgerResult } from './database-types';
import { schema } from './vercel-schema.mjs';
const result=<T>(r:ResultSet):LedgerResult<T>=>({results:r.rows.map(row=>Object.fromEntries(r.columns.map(c=>[c,row[c]]))) as T[],meta:{changes:r.rowsAffected}});
class Statement implements LedgerStatement{
 constructor(readonly client:Client,readonly sql:string,readonly args:InValue[]=[]){ }
 bind(...values:any[]){return new Statement(this.client,this.sql,values.map(v=>v===undefined?null:v));}
 async all<T=unknown>(){return result<T>(await this.client.execute({sql:this.sql,args:this.args}));}
 async first<T=unknown>(){return (await this.all<T>()).results[0]??null;}
 async run(){return this.all();}
}
export function adaptDatabase(client:Client):LedgerDatabase{
 return {prepare:sql=>new Statement(client,sql),async batch(statements){
  const inputs=statements.map(s=>{if(!(s instanceof Statement)||s.client!==client)throw Error('Invalid database statement.');return {sql:s.sql,args:s.args};});
  // libSQL batches are sequential and transactional, matching D1's behavior.
  return (await client.batch(inputs,'write')).map(r=>result(r));
 }};
}
let initialized:Promise<LedgerDatabase>|undefined;
export async function database():Promise<LedgerDatabase>{
 if(!initialized)initialized=(async()=>{
  const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
  const localTest=process.env.LEDGER_LOCAL_TEST==='1'&&!process.env.VERCEL&&url?.startsWith('file:');
  if(!url||(!localTest&&(!/^(libsql|https):\/\//.test(url)||!authToken)))throw Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel.');
  const client=createClient({url,authToken});
  try{await client.batch(schema,'write');return adaptDatabase(client);}catch(e){client.close();throw e;}
 })().catch(e=>{initialized=undefined;throw e;});
 return initialized;
}
