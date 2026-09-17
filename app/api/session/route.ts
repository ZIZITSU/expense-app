import { standalone } from '@/lib/runtime';
import { database } from '@/lib/database';
import { authConfigured,correctPassword,createSession,cookieValue,attemptKey } from '@/lib/session';
const reply=(body:any,status=200,headers:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
function sameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin;}
export async function POST(request:Request){
 if(!standalone)return reply({error:'Not found.'},404);
 if(!sameOrigin(request))return reply({error:'Invalid request origin.'},403);
 if(!authConfigured())return reply({error:'Sign-in is not configured yet.'},503);
 try{
  const body:any=await request.json();if(typeof body?.password!=='string'||body.password.length>256)return reply({error:'Enter your password.'},400);
  const db=await database(),now=Date.now(),reset=now+15*60*1000;
  const id=await attemptKey(process.env.VERCEL?request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown':'local');
  await db.prepare('DELETE FROM auth_attempts WHERE reset_at<?').bind(now).run();
  const limit=await db.prepare('INSERT INTO auth_attempts(id,attempts,reset_at) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1 RETURNING attempts,reset_at').bind(id,reset).first<{attempts:number;reset_at:number}>();
  if(limit&&limit.attempts>20)return reply({error:'Too many attempts. Try again in 15 minutes.'},429,{'Retry-After':String(Math.max(1,Math.ceil((limit.reset_at-now)/1000)))});
  if(!await correctPassword(body.password))return reply({error:'Incorrect password.'},401);
  return reply({ok:true},200,{'Set-Cookie':cookieValue(await createSession())});
 }catch(e){console.error('Sign-in setup or database error:',e);return reply({error:'Sign-in is unavailable. Check the database settings and retry.'},503);}
}
export async function DELETE(request:Request){
 if(!standalone)return reply({error:'Not found.'},404);
 if(!sameOrigin(request))return reply({error:'Invalid request origin.'},403);
 return reply({ok:true},200,{'Set-Cookie':cookieValue('',0)});
}
