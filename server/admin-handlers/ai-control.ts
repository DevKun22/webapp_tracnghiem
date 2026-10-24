import { authorize, auditAdmin, checkPostOrigin, cookieToken, json, service, type Request, type Response } from '../admin-shared.js';
import { readAIControl } from '../ai-control.js';
import { getConfigs } from '../ai-providers.js';
export default async function handler(req:Request,res:Response){
 if(req.method!=='GET'&&req.method!=='POST')return json(res,405,{message:'Phương thức không được hỗ trợ.'});
 if(req.method==='POST'&&!checkPostOrigin(req,res))return;
 if(!await authorize(req,res))return;
 if(req.method==='GET')return json(res,200,{control:await readAIControl()});
 const data=req.body as {tutor_enabled?:unknown;firebase_diagnostic_enabled?:unknown;firebase_learner_enabled?:unknown;ai_runtime_mode?:unknown}|undefined;
 if(!data||typeof data.tutor_enabled!=='boolean'||typeof data.firebase_diagnostic_enabled!=='boolean'||typeof data.firebase_learner_enabled!=='boolean'||!['spark','blaze'].includes(String(data.ai_runtime_mode)))return json(res,400,{message:'Cấu hình công tắc không hợp lệ.'});
 const db=service();if(!db)return json(res,503,{message:'Không thể truy cập cấu hình AI.'});
 if(data.ai_runtime_mode==='spark'&&data.firebase_learner_enabled)return json(res,409,{code:'SPARK_FIREBASE_GUARD_UNAVAILABLE',message:'Spark không hỗ trợ bộ bảo vệ Firebase bằng Cloud Functions. Hãy tắt Firebase cho người học hoặc chọn chế độ Blaze đã triển khai guard.'});
 // Production learner route is server-only; never enable browser Firebase by toggling UI.
 if(data.tutor_enabled && !data.firebase_learner_enabled){
  const providers=await getConfigs();
  if(!providers.some(p=>p.enabled&&p.configured&&p.connected&&p.key))return json(res,409,{code:'NO_VERIFIED_SERVER_PROVIDER',message:'Chưa có nhà cung cấp Gateway được xác minh. Firebase Web chỉ là kết nối chẩn đoán.'});
 }
 if(data.firebase_learner_enabled && data.ai_runtime_mode==='blaze' && (!process.env.AI_FIREBASE_GATE_SECRET || process.env.AI_FIREBASE_GATE_SECRET.length<32 || process.env.AI_FIREBASE_GUARD_DEPLOYED!=='true'))return json(res,409,{code:'FIREBASE_GUARD_NOT_READY',message:'Chưa xác minh bộ bảo vệ quota của Firebase phía server.'});
 const {error}=await db.from('ai_system_control').update({ai_runtime_mode:data.ai_runtime_mode,tutor_enabled:data.tutor_enabled,firebase_diagnostic_enabled:data.firebase_diagnostic_enabled,firebase_learner_enabled:data.firebase_learner_enabled,updated_at:new Date().toISOString()}).eq('id',1);
 if(error)return json(res,503,{message:'Không lưu được công tắc. Kiểm tra migration 12.'});
 await auditAdmin('AI_CONTROL_UPDATED',cookieToken(req),{ai_runtime_mode:data.ai_runtime_mode,tutor_enabled:data.tutor_enabled,firebase_diagnostic_enabled:data.firebase_diagnostic_enabled,firebase_learner_enabled:data.firebase_learner_enabled});
 return json(res,200,{control:await readAIControl(),message:'Đã cập nhật công tắc phía server.'});
}
