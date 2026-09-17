export const SESSION_COOKIE='expenses_session';
export const OWNER_ID='local_seedy';
const lifetime=7*86400,encoder=new TextEncoder();
export function authConfigured(){return (process.env.APP_PASSWORD?.length||0)>=16&&(process.env.SESSION_SECRET?.length||0)>=32;}
async function key(){
 if(!authConfigured())throw Error('Set APP_PASSWORD (16+ characters) and SESSION_SECRET (32+ characters) in Vercel.');
 return crypto.subtle.importKey('raw',encoder.encode(process.env.SESSION_SECRET+'\0'+process.env.APP_PASSWORD),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
const hex=(b:ArrayBuffer)=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
export async function correctPassword(password:string){
 if(!authConfigured())return false;
 const [a,b]=await Promise.all([password,process.env.APP_PASSWORD!].map(p=>crypto.subtle.digest('SHA-256',encoder.encode(p))));
 const aa=new Uint8Array(a),bb=new Uint8Array(b);let different=0;for(let i=0;i<aa.length;i++)different|=aa[i]^bb[i];return different===0;
}
export async function createSession(){
 const expires=Math.floor(Date.now()/1000)+lifetime;
 return expires+'.'+hex(await crypto.subtle.sign('HMAC',await key(),encoder.encode(OWNER_ID+':'+expires)));
}
export async function validSession(token:string|undefined){
 if(!authConfigured()||!token||!/^\d{10}\.[a-f0-9]{64}$/.test(token))return false;
 const [expiry,signature]=token.split('.'),expires=Number(expiry),now=Math.floor(Date.now()/1000);
 if(expires<=now||expires>now+lifetime+60)return false;
 return crypto.subtle.verify('HMAC',await key(),Uint8Array.from(signature.match(/../g)!,h=>parseInt(h,16)),encoder.encode(OWNER_ID+':'+expires));
}
export async function attemptKey(ip:string){return hex(await crypto.subtle.sign('HMAC',await key(),encoder.encode('login:'+ip)));}
export function cookieValue(token:string,maxAge=lifetime){
 const secure=!!process.env.VERCEL||process.env.NODE_ENV==='production';
 return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`;
}
