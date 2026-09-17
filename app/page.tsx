import Ledger from './ledger';
import { requireChatGPTUser } from './chatgpt-auth';
import { standalone } from '@/lib/runtime';
export const dynamic='force-dynamic';
export default async function Home(){await requireChatGPTUser('/');return <Ledger standalone={standalone}/>;}
