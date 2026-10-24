import { adminEncryptionKey, decryptSecret, encryptSecret, service } from './admin-shared.js';
export type Provider = 'gemini' | 'openai';
export type ProviderConfig = { provider: Provider; model: string; enabled: boolean; configured: boolean; connected: boolean; lastCheckedAt: string | null; key?: string };
export const DEFAULT_MODELS: Record<Provider, string> = { gemini: 'gemini-3.5-flash-lite', openai: 'gpt-4.1-mini' };
export type AIResult = { ok: boolean; code: string; message: string; text?: string; retryable: boolean };
export const isProvider = (p: unknown): p is Provider => p === 'gemini' || p === 'openai';
export const safeConfig = ({key: _secret, ...rest}: ProviderConfig) => rest;
export async function getConfigs(): Promise<ProviderConfig[]> {
 const client=service();
 const rows = client ? await client.from('ai_provider_configs').select('provider,model,enabled,encrypted_api_key,last_connected,last_checked_at') : null;
 const key=adminEncryptionKey();
 return (['gemini','openai'] as Provider[]).map(provider => {
  const row=rows?.data?.find(r=>r.provider===provider);
  let secret: string|undefined;
  if(row?.encrypted_api_key && key) { try { secret=decryptSecret(row.encrypted_api_key,key); } catch { /* locked */ } }
  if(!row && provider==='openai') secret=process.env.AI_PROVIDER_API_KEY || undefined;
  return {provider, model:String(row?.model || (provider==='openai' ? process.env.AI_PROVIDER_MODEL : undefined) || DEFAULT_MODELS[provider]), enabled: row?.enabled === true, configured:!!secret, connected:row?.last_connected === true, lastCheckedAt:row?.last_checked_at || null, key:secret};
 });
}
export async function saveConfig(provider: Provider, model: string, enabled: boolean, newKey?: string) {
 const client=service(), cipher=adminEncryptionKey();
 if(!client||!cipher) throw new Error('AI_SECRET_STORAGE_UNAVAILABLE');
 const previous=(await getConfigs()).find(v=>v.provider===provider)!;
 const secret=newKey?.trim() || previous.key;
 if(!secret) throw new Error('AI_KEY_REQUIRED');
 const result=await checkProvider(provider,secret,model,'Trả lời bằng một từ: OK.');
 // Allow saving disconnected providers disabled; only enable after a live success.
 if(enabled&&!result.ok) return { result, saved:false };
 const {error}=await client.from('ai_provider_configs').upsert({provider,model,enabled,encrypted_api_key:encryptSecret(secret,cipher),last_connected:result.ok,last_checked_at:new Date().toISOString()},{onConflict:'provider'});
 if(error) throw new Error('AI_PROVIDER_STORAGE_FAILED');
 return {result,saved:true};
}
export async function checkProvider(provider: Provider, secret: string, model: string, prompt: string): Promise<AIResult> {
 const abort=new AbortController(); const timeout=setTimeout(()=>abort.abort(),15000);
 try {
  const url=provider==='gemini'?`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`:'https://api.openai.com/v1/responses';
  const headers:Record<string,string>={'Content-Type':'application/json'};
  if(provider==='gemini') headers['x-goog-api-key']=secret;
  else headers.Authorization=`Bearer ${secret}`;
  const body=provider==='gemini' ? {contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:1024}} : {model,input:prompt,max_output_tokens:1024};
  const response=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:abort.signal});
  if(!response.ok){
   let providerCode='';try{ const errorData=await response.json() as {error?:{code?:number;status?:string;message?:string;type?:string}};providerCode=String(errorData.error?.status||errorData.error?.type||'');}catch{}
   if(response.status===401||response.status===403||providerCode==='PERMISSION_DENIED')return{ok:false,code:'INVALID_KEY',message:'API key không hợp lệ hoặc thiếu quyền.',retryable:false};
   if(response.status===429){ const quota=/insufficient_quota|RESOURCE_EXHAUSTED|quota/i.test(providerCode);return{ok:false,code:quota?'PROVIDER_QUOTA':'PROVIDER_RATE_LIMIT',message:'Nhà cung cấp AI đã vượt hạn mức hoặc giới hạn tốc độ.',retryable:true}; }
   if(response.status===400||response.status===404)return{ok:false,code:'MODEL_UNAVAILABLE',message:'Model không khả dụng cho key này.',retryable:false};
   if(response.status>=500)return{ok:false,code:'PROVIDER_UNAVAILABLE',message:'Nhà cung cấp AI đang gặp sự cố.',retryable:true};
   return{ok:false,code:'PROVIDER_ERROR',message:'Nhà cung cấp AI từ chối yêu cầu.',retryable:false};
  }
  const data=await response.json() as any;
  const text=provider==='gemini' ? (data.candidates?.[0]?.content?.parts||[]).map((x:{text?:string})=>x.text||'').join('') : (data.output||[]).flatMap((x:{content?:{type?:string;text?:string}[]})=>x.content||[]).filter((x:{type?:string})=>x.type==='output_text').map((x:{text?:string})=>x.text||'').join('');
  if(!text.trim())return{ok:false,code:'EMPTY_RESPONSE',message:'AI không trả về nội dung.',retryable:true};
  return{ok:true,code:'CONNECTED',message:'Kết nối AI thành công.',text:text.trim(),retryable:false};
 }catch{return{ok:false,code:'NETWORK_ERROR',message:'Không kết nối được AI hoặc quá thời gian chờ.',retryable:true};}
 finally{clearTimeout(timeout);}
}
