import { env } from 'cloudflare:workers';
import seed from './seed.json';
import { RecordData, summarize, today } from './model';
export function database(): D1Database { if(!env.DB)throw new Error('Storage is unavailable. Please try again.'); return env.DB as D1Database; }
export async function load(user: string) {
 const db=database();
 const meta=await db.prepare('SELECT user FROM metadata WHERE user=?').bind(user).first();
 if(!meta) {
  await db.batch([...seed.map(r=>db.prepare('INSERT OR IGNORE INTO records(id,user,kind,data,updated) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM metadata WHERE user=?)').bind(user+':'+r.id,user,r.kind,JSON.stringify({...r,id:user+':'+r.id}),new Date().toISOString(),user)),db.prepare('INSERT OR IGNORE INTO metadata(user,initialized) VALUES(?,1)').bind(user)]);
 }
 const {results}=await db.prepare('SELECT id,kind,data,deleted,version FROM records WHERE user=?').bind(user).all<{id:string;kind:string;data:string;deleted:number;version:number}>();
 let records=results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind,deleted:!!r.deleted,version:r.version})) as RecordData[];
 // The workbook's Savings cell totals its four real accounts. Archive the
 // mistakenly imported fifth account once; preserve the original in backups
 // and history. This is a data correction, not a schema change.
 const aggregateId=user+':import-account-4';
 const aggregate=records.find(r=>r.id===aggregateId&&r.kind==='account'&&r.name==='Savings'&&!r.deleted);
 if(aggregate){
  if(records.some(r=>r.account===aggregateId))throw new Error('The old Savings total has linked entries. Assign them to a real account before correcting the total.');
  const stamp=new Date().toISOString();
  const archived={...aggregate,aggregate:true};delete archived.version;delete archived.deleted;
  await db.batch([
   db.prepare('INSERT OR IGNORE INTO backups(id,user,data,date) VALUES(?,?,?,?)').bind(user+':savings-meaning-correction',user,JSON.stringify(records),today()),
   db.prepare('INSERT INTO history(id,user,record,data,date) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND user=? AND version=? AND deleted=0)').bind(crypto.randomUUID(),user,aggregateId,JSON.stringify(aggregate),stamp,aggregateId,user,aggregate.version),
   db.prepare('UPDATE records SET deleted=1,data=?,version=version+1,updated=? WHERE id=? AND user=? AND version=? AND deleted=0').bind(JSON.stringify(archived),stamp,aggregateId,user,aggregate.version),
  ]);
  // Re-read to respect concurrent edits rather than returning an assumed state.
  return load(user);
 }
 // One bounded, durable snapshot per active day, before any edits.
 await db.prepare('INSERT OR IGNORE INTO backups(id,user,data,date) VALUES(?,?,?,?)').bind(user+':'+today(),user,JSON.stringify(records),today()).run();
 return summarize(records);
}
