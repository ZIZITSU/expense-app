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
 const records=results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind,deleted:!!r.deleted,version:r.version})) as RecordData[];
 // One bounded, durable snapshot per active day, before any edits.
 await db.prepare('INSERT OR IGNORE INTO backups(id,user,data,date) VALUES(?,?,?,?)').bind(user+':'+today(),user,JSON.stringify(records),today()).run();
 return summarize(records);
}
