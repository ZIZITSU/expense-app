import { redirect } from 'next/navigation';
import { standalone } from '@/lib/runtime';
import { getChatGPTUser } from '../chatgpt-auth';
import LoginForm from './login-form';
export const dynamic='force-dynamic';
export default async function Login(){if(!standalone||await getChatGPTUser())redirect('/');return <LoginForm/>;}
