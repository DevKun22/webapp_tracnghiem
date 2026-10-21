import {createClient} from '@supabase/supabase-js';
import {env} from '../config/env';

// Chỉ dùng publishable/anon key tại trình duyệt; tuyệt đối không dùng service_role key.
const url=env?.VITE_SUPABASE_URL;
const key=env?.VITE_SUPABASE_ANON_KEY;
export const isConfigured=Boolean(url&&key&&!url.includes('YOUR_PROJECT')&&!key.includes('YOUR_'));
export const supabase=isConfigured?createClient(url!,key!,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export async function rpc<T>(fn:string,args:Record<string,unknown>={}):Promise<T>{
  if(!supabase)throw new Error('Thiếu Supabase URL/key trong .env.local');
  const {data,error}=await supabase.rpc(fn,args);
  if(error)throw new Error(error.message);
  return data as T;
}
