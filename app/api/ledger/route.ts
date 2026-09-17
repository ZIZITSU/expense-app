import { getChatGPTUser } from '../../chatgpt-auth';
import { database,load } from '../../../lib/store';
import { RecordData,today } from '../../../lib/model';
const reply=(data: any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const validDate=(s:any)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const amount=(n:any,zero=false)=>Number.isSafeInteger(n)&&n>=(zero?0:1)&&n<=1000000000000;
export async function GET(){try{const u=await getChatGPTUser();if(!u)return reply({error:'Please sign in to view your ledger.'},401);return reply(await load(u.userId));}catch(e){console.error(e);return reply({error:'Your ledger could not load. Please retry.'},503);}}
export async function POST(request:Request){try{
 const u=await getChatGPTUser();if(!u)return reply({error:'Please sign in to save.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Invalid request origin.'},403);
 const body:any=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Invalid entry.'},400);const state=await load(u.userId);const db=await database();
 const old=body.id?state.records.find(r=>r.id===body.id):undefined;
 if(body.id&&!old)return reply({error:'This entry was not found.'},404);
 if(old&&body.version!==old.version)return reply({error:'This entry changed in another window. Refresh and try again.'},409);
 const action=body.action||'save';
 if(['delete','restore'].includes(action)){
  if(!old)return reply({error:'Choose an entry.'},400);
  if(old.deleted===(action==='delete'))return reply(state);
  if(old?.kind==='account')return reply({error:'Deactivate an account instead of deleting it.'},400);
  if(action==='restore'&&old.kind==='payment') {const d=state.debts.find(d=>d.id===old.debt);if(!d)return reply({error:'Restore the debt first.'},400);if(old.amount>d.remaining)return reply({error:'Restoring this payment would overpay the debt.'},400);}
  let guard='';let extra:any[]=[];
  if(action==='restore'&&old.kind==='debt'){guard=" AND ? >= COALESCE((SELECT SUM(CAST(json_extract(data,'$.amount') AS INTEGER)) FROM records WHERE user=? AND kind='payment' AND json_extract(data,'$.debt')=? AND (deleted=0 OR json_extract(data,'$.deletedWithDebt')=?)),0)";extra=[old.amount,u.userId,old.id,old.id];}
  if(action==='restore'&&old?.kind==='payment'){guard=" AND ? <= (SELECT CAST(json_extract(data,'$.amount') AS INTEGER) FROM records WHERE id=? AND user=? AND deleted=0) - COALESCE((SELECT SUM(CAST(json_extract(data,'$.amount') AS INTEGER)) FROM records WHERE user=? AND kind='payment' AND deleted=0 AND json_extract(data,'$.debt')=?),0)";extra=[old.amount,old.debt,u.userId,u.userId,old.debt];}
  const stamp=new Date().toISOString();
  const audit=db.prepare('INSERT INTO history(id,user,record,data,date) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND user=? AND version=?)').bind(crypto.randomUUID(),u.userId,old!.id,JSON.stringify(old),stamp,old!.id,u.userId,old!.version!+1);
  const operations=[db.prepare('UPDATE records SET deleted=?,version=version+1,updated=? WHERE user=? AND id=? AND version=?'+guard).bind(action==='delete'?1:0,stamp,u.userId,old.id,old.version,...extra),audit];
  if(old.kind==='debt'){
   // One atomic batch archives/restores the parent and only its linked active
   // repayments. Previously deleted repayments remain deleted when restored.
   const deleted=action==='delete'?1:0;
   const linked="user=? AND kind='payment' AND json_extract(data,'$.debt')=? AND "+(deleted?"deleted=0":"deleted=1 AND json_extract(data,'$.deletedWithDebt')=?")+" AND EXISTS(SELECT 1 FROM records WHERE id=? AND user=? AND version=? AND deleted=?)";
   const binds=[u.userId,old.id,...(deleted?[]:[old.id]),old.id,u.userId,old.version!+1,deleted];
   operations.push(db.prepare("INSERT INTO history(id,user,record,data,date) SELECT lower(hex(randomblob(16))),user,id,json_set(data,'$.version',version,'$.deleted',json(CASE WHEN deleted=1 THEN 'true' ELSE 'false' END)),? FROM records WHERE "+linked).bind(stamp,...binds));
   const data=deleted?"json_set(data,'$.deletedWithDebt',?)":"json_remove(data,'$.deletedWithDebt')";
   operations.push(db.prepare('UPDATE records SET data='+data+',deleted=?,version=version+1,updated=? WHERE '+linked).bind(...(deleted?[old.id]:[]),deleted,stamp,...binds));
  }
  const [res]=await db.batch(operations);
  if(!res.meta.changes)return reply({error:'Entry changed. Please retry.'},409);
  return reply(await load(u.userId));
 }
 if(old?.deleted)throw new Error('Restore this entry before editing it.');
 const r:RecordData={...body,id:old?.id||crypto.randomUUID(),kind:old?.kind||body.kind};delete r.action;delete r.version;delete r.deleted;
 if(!['account','income','expense','debt','payment','transfer'].includes(r.kind))throw new Error('Invalid entry type.');
 for(const k of ['name','label','description','person','notes'])if(r[k]!=null&&(typeof r[k]!=='string'||r[k].length>2000))throw new Error('Text is too long.');
 if(r.kind==='account'){if(!r.name?.trim())throw new Error('Enter an account name.');if(!Number.isSafeInteger(r.opening)||Math.abs(r.opening)>1000000000000)throw new Error('Enter a valid opening balance.');r.active=!!r.active;}
 else {
  if(!amount(r.amount,r.kind==='expense'))throw new Error('Enter a valid amount with at most two decimal places.');
  if(!(r.kind==='debt'&&old&&!r.date)&&(!validDate(r.date)||r.date>today()))throw new Error('Enter a valid date no later than today.');
  r.affectsBalance=!!r.affectsBalance;
  // Selecting an account is the cash movement for debt entries; no expense or
  // income transaction is needed. Undated opening debts from the workbook may
  // retain their unassigned account because their cash is in the snapshot.
  if(r.kind==='debt'){
   r.affectsBalance=!!r.account;
   if(!r.account&&!(old&&!old.account&&!old.affectsBalance))throw new Error('Choose the account used to lend or borrow this money.');
  }
  if(['payment','transfer'].includes(r.kind))r.affectsBalance=true;
  if(r.kind==='transfer'){
   if(!r.toAccount||!state.accounts.some(a=>a.id===r.toAccount))throw new Error('Choose a valid destination account.');
   if(r.account===r.toAccount)throw new Error('Choose two different accounts for a transfer.');
  }
  if(r.account&&!state.accounts.some(a=>a.id===r.account))throw new Error('Choose a valid account.');
  if(r.affectsBalance&&!r.account)throw new Error('Choose an account for this balance movement.');
  if(['income','expense'].includes(r.kind)&&!r.label?.trim())throw new Error('Enter a source or category.');
  if(r.kind==='expense'&&!['done','pending','cancelled'].includes(r.status))throw new Error('Choose a valid status.');
  if(r.kind==='debt') {
   if(!r.person?.trim()||!['owed_to_me','owed_by_me'].includes(r.direction))throw new Error('Enter the person and direction.');
   if(r.due&&(!validDate(r.due)||(r.date&&r.due<r.date)))throw new Error('Due date must be on or after the start date.');
   const d=state.debts.find(d=>d.id===r.id);if(d&&(r.amount<d.settled||(d.settled>0&&r.direction!==d.direction)))throw new Error('Amount cannot be below repayments, and direction cannot change after repayment.');
   if(d?.payments.some((p:RecordData)=>r.date&&p.date<r.date))throw new Error('Start date cannot be after a repayment.');
  }
  if(r.kind==='payment') {
   const d=state.debts.find(d=>d.id===r.debt);if(!d)throw new Error('Debt was not found.');
   if(r.amount>d.remaining+(old?.amount||0))throw new Error('Repayment exceeds the remaining debt.');
   if(d.date&&r.date<d.date)throw new Error('Repayment cannot be before the debt start date.');
  }
 }
 // Guard payment totals in SQL as well, so concurrent repayments cannot overpay.
 let guard='';let binds:any[]=[];
 if(r.kind==='payment'){guard=" AND ? <= (SELECT CAST(json_extract(data,'$.amount') AS INTEGER) FROM records WHERE id=? AND user=? AND deleted=0) - COALESCE((SELECT SUM(CAST(json_extract(data,'$.amount') AS INTEGER)) FROM records WHERE user=? AND kind='payment' AND deleted=0 AND json_extract(data,'$.debt')=? AND id<>?),0)";binds=[r.amount,r.debt,u.userId,u.userId,r.debt,r.id];}
 if(r.kind==='debt'){guard=" AND ? >= COALESCE((SELECT SUM(CAST(json_extract(data,'$.amount') AS INTEGER)) FROM records WHERE user=? AND kind='payment' AND deleted=0 AND json_extract(data,'$.debt')=?),0)";binds=[r.amount,u.userId,r.id];if(old&&r.direction!==old.direction){guard+=" AND NOT EXISTS(SELECT 1 FROM records WHERE user=? AND kind='payment' AND deleted=0 AND json_extract(data,'$.debt')=?)";binds.push(u.userId,r.id);}}
 const stamp=new Date().toISOString();
 const stmt=old?db.prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND user=? AND version=?'+guard).bind(JSON.stringify(r),stamp,r.id,u.userId,old.version,...binds):db.prepare('INSERT INTO records(id,user,kind,data,updated) SELECT ?,?,?,?,? WHERE 1=1'+guard).bind(r.id,u.userId,r.kind,JSON.stringify(r),stamp,...binds);
 const operations=[stmt];if(old)operations.push(db.prepare('INSERT INTO history(id,user,record,data,date) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND user=? AND version=?)').bind(crypto.randomUUID(),u.userId,r.id,JSON.stringify(old),stamp,r.id,u.userId,old.version!+1));
 const [result]=await db.batch(operations);if(!result.meta.changes)return reply({error:'The entry changed or the debt would be overpaid. Refresh and retry.'},409);
 return reply(await load(u.userId));
 }catch(e){console.error(e);return reply({error:e instanceof Error?e.message:'Could not save. Please retry.'},400);}}
