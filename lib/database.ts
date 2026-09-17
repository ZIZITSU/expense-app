import { env } from 'cloudflare:workers';
import type { LedgerDatabase } from './database-types';
export async function database():Promise<LedgerDatabase>{
 if(!env.DB)throw new Error('Storage is unavailable. Please try again.');
 return env.DB as unknown as LedgerDatabase;
}
