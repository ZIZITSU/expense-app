'use client';
import { useState } from 'react';import { Wallet } from 'lucide-react';
export default function LoginForm(){
 const [password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});const data:any=await r.json();if(!r.ok)throw Error(data.error);window.location.replace('/');}catch(e){setError((e as Error).message);setBusy(false);}}
 return <main className="login-shell"><section className="panel login-card"><span className="brand-mark"><Wallet size={25}/></span><h1>Simple Expenses</h1><p>Sign in to your ledger.</p><form onSubmit={submit} className="entry-form"><label className="field"><span>Password</span><input type="password" autoFocus required autoComplete="current-password" maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div role="alert" className="form-error">{error}</div>}<button className="btn primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form></section></main>;
}
