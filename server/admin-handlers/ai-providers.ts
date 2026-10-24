import { authorize, json, checkPostOrigin, cookieToken, auditAdmin, type Request, type Response, service } from '../admin-shared.js';
import { getConfigs, isProvider, safeConfig, saveConfig, checkProvider } from '../ai-providers.js';
export default async function handler(req:Request,res:Response){
 if(!['GET','POST'].includes(req.method||''))return json(res,405,{message:'Phương thức không được hỗ trợ.'});
 if(req.method==='POST'&&!checkPostOrigin(req,res))return;
 if(!await authorize(req,res))return;
 if(req.method==='GET')return json(res,200,{providers:(await getConfigs()).map(safeConfig)});
 let payload:unknown=req.body;
 if(!payload){let raw='';for await(const part of req){raw+=String(part);if(raw.length>10000)return json(res,413,{message:'Dữ liệu vượt giới hạn.'});}try{payload=JSON.parse(raw)}catch{return json(res,400,{message:'Dữ liệu không hợp lệ.'})}}
 const x=payload as Record<string,unknown>;
 if(!x||!isProvider(x.provider)||typeof x.model!=='string'||!/^[a-zA-Z0-9._-]{3,100}$/.test(x.model)||typeof x.enabled!=='boolean'||(x.apiKey!==undefined&&(typeof x.apiKey!=='string'||x.apiKey.length>4096)))return json(res,400,{message:'Cấu hình AI không hợp lệ.'});
 try{
  if(x.action==='check'){
   const cfg=(await getConfigs()).find(v=>v.provider===x.provider)!;
   if(!cfg.key)return json(res,400,{code:'AI_KEY_REQUIRED',message:'Chưa có khóa API.'});
   const result=await checkProvider(cfg.provider,cfg.key,x.model,'Trả lời đúng một từ OK.');
   await service()?.from('ai_provider_configs').update({last_connected:result.ok,last_checked_at:new Date().toISOString()}).eq('provider',cfg.provider);
   return json(res,200,{...result,provider:cfg.provider});
  }
  const {result,saved}=await saveConfig(x.provider,x.model,x.enabled,x.apiKey as string|undefined);
  if(!saved)return json(res,422,{code:result.code,message:`Không thể bật AI: ${result.message}`});
  await auditAdmin('AI_PROVIDER_UPDATED',cookieToken(req),{provider:x.provider,model:x.model,enabled:x.enabled,connected:result.ok});
  return json(res,200,{...result,provider:x.provider,message:result.ok?'Đã lưu và xác minh cấu hình thành công.':'Đã lưu cấu hình ở trạng thái tắt; cần kiểm tra lại kết nối.'});
 }catch(e){const code=e instanceof Error?e.message:'AI_SAVE_ERROR';return json(res,503,{code,message:code==='AI_SECRET_STORAGE_UNAVAILABLE'?'Chưa cấu hình khóa mã hóa server hoặc Supabase.':code==='AI_KEY_REQUIRED'?'Cần nhập API key trước.':'Không thể lưu cấu hình AI. Kiểm tra migration và kết nối database.'});}
}
