export type RecordData = { id: string; kind: string; version?: number; deleted?: boolean; [key: string]: any };
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const elapsed = (date: string, end=today()) => date ? Math.max(0,Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(date+'T00:00:00Z'))/86400000)) : null;
export function summarize(all: RecordData[]) {
 const records=all.filter(r=>!r.deleted), tx=records.filter(r=>['income','expense'].includes(r.kind));
 const accounts=records.filter(r=>r.kind==='account').map(a=>({...a,balance: a.opening + records.reduce((n,r)=> {
   if(r.account!==a.id || !r.affectsBalance)return n;
   if(r.kind==='income')return n+r.amount;
   if(r.kind==='expense' && r.status==='done')return n-r.amount;
   if(r.kind==='debt')return n+(r.direction==='owed_by_me'?r.amount:-r.amount);
   if(r.kind==='payment'){const d=records.find(d=>d.id===r.debt); return n+(d?.direction==='owed_to_me'?r.amount:-r.amount);}
   return n;
 },0)}));
 const debts:RecordData[]=records.filter(r=>r.kind==='debt').map(d=>{const payments=records.filter(p=>p.kind==='payment'&&p.debt===d.id).sort((a,b)=>a.date.localeCompare(b.date));const settled=payments.reduce((n,p)=>n+p.amount,0);const remaining=d.amount-settled;return {...d,payments,settled,remaining,days:elapsed(d.date,remaining===0?payments.at(-1)?.date:today()),status: remaining===0?'paid':d.due&&d.due<today()?'overdue':settled?'partially_paid':'pending'};});
 const months=[...new Set(tx.map(r=>r.date.slice(0,7)))].sort().map(month=>{const rows=tx.filter(r=>r.date.startsWith(month));const income=rows.filter(r=>r.kind==='income').reduce((n,r)=>n+r.amount,0),expenses=rows.filter(r=>r.kind==='expense'&&r.status==='done').reduce((n,r)=>n+r.amount,0);return {month,income,expenses,savings:income-expenses};});
 return {records:all,accounts,debts,months,totalBalance:accounts.reduce((n,a)=>n+a.balance,0),today:today()};
}
