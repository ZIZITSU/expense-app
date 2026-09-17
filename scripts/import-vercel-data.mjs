import fs from 'node:fs';
import { createClient } from '@libsql/client';
import { schema } from '../lib/vercel-schema.mjs';
const args=process.argv.slice(2),file=args[args.indexOf('--file')+1];
if(!args.includes('--file')||!file)throw Error('Usage: npm run import:vercel -- --file /path/to/ledger-backup.json');
const url=process.env.TURSO_DATABASE_URL,authToken=process.env.TURSO_AUTH_TOKEN;
const localTest=process.env.LEDGER_LOCAL_TEST==='1'&&!process.env.VERCEL&&url?.startsWith('file:');
if(!url||(!localTest&&(!authToken||!/^(libsql|https):\/\//.test(url))))throw Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.vercel.local first.');
const backup=JSON.parse(fs.readFileSync(file,'utf8'));
if(backup.version!==1||!Array.isArray(backup.records)||!backup.records.length)throw Error('Use a full JSON backup from Simple Expenses.');
const owner='local_seedy',seen=new Set(),kinds=['account','income','expense','debt','payment','transfer'];
for(const r of backup.records){
 if(!r||typeof r.id!=='string'||r.id.length>256||seen.has(r.id)||!kinds.includes(r.kind)||!Number.isSafeInteger(r.version)||r.version<1)throw Error('Invalid or duplicate backup record.');
 if(r.kind==='account'){if(!Number.isSafeInteger(r.opening))throw Error('Invalid opening balance.');}
 else if(!Number.isSafeInteger(r.amount)||r.amount<0)throw Error('Invalid transaction amount.');
 seen.add(r.id);
}
const client=createClient({url,authToken});
try{
 await client.batch(schema,'write');
 // Take a write transaction before checking emptiness, preventing first-use
 // initialization or another importer from racing the import.
 const tx=await client.transaction('write');
 try{
  const count=await tx.execute({sql:'SELECT COUNT(*) AS count FROM records WHERE user=?',args:[owner]});
  if(Number(count.rows[0].count)>0)throw Error('The destination ledger is not empty. Import into a fresh database before signing in. Nothing was overwritten.');
  await tx.batch(backup.records.map(r=>{const data={...r};delete data.deleted;delete data.version;return {sql:'INSERT INTO records(id,user,kind,data,deleted,version,updated) VALUES(?,?,?,?,?,?,?)',args:[r.id,owner,r.kind,JSON.stringify(data),r.deleted?1:0,r.version,new Date().toISOString()]};}));
  await tx.execute({sql:'INSERT OR REPLACE INTO metadata(user,initialized) VALUES(?,1)',args:[owner]});
  await tx.execute({sql:'INSERT INTO backups(id,user,data,date) VALUES(?,?,?,?)',args:[owner+':migration:'+crypto.randomUUID(),owner,JSON.stringify(backup.records),new Date().toISOString().slice(0,10)]});
  await tx.commit();console.log(`Imported ${backup.records.length} records, preserving IDs, versions and deleted entries.`);
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}finally{client.close();}
