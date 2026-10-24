import {authorize,auditAdmin,checkPostOrigin,cookieToken,json,service,type Request,type Response} from '../admin-shared.js';
const validPeriod=(x:unknown)=>['lifetime','daily','weekly','monthly'].includes(String(x));
const validLimit=(x:unknown)=>Number.isInteger(x)&&Number(x)>=0&&Number(x)<=10000;
export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method||''))return json(res,405,{message:'Phương thức không hỗ trợ.'});
 if(req.method==='POST'&&!checkPostOrigin(req,res))return;
 if(!await authorize(req,res))return;
 const db=service();if(!db)return json(res,503,{message:'Chưa kết nối hệ thống.'});
 if(req.method==='GET'){
  const {data,error}=await db.from('ai_quota_policies').select('account_type,limit_count,period,enabled,updated_at').order('account_type');
  if(error)return json(res,503,{message:'Không tải được hạn mức. Kiểm tra migration 14.'});
  return json(res,200,{policies:data});
 }
 const b=req.body as {accountType?:unknown;limit?:unknown;period?:unknown;enabled?:unknown}|undefined;
 if(!b||!['guest','verified','admin'].includes(String(b.accountType))||!validLimit(b.limit)||!validPeriod(b.period)||typeof b.enabled!=='boolean')return json(res,400,{message:'Hạn mức không hợp lệ. Giới hạn từ 0 đến 10.000 lượt.'});
 const type=String(b.accountType);
 const old=await db.from('ai_quota_policies').select('limit_count,period,enabled').eq('account_type',type).maybeSingle();
 if(old.error||!old.data)return json(res,503,{message:'Chưa có chính sách hạn mức.'});
 const {error}=await db.from('ai_quota_policies').update({limit_count:b.limit,period:b.period,enabled:b.enabled,updated_at:new Date().toISOString()}).eq('account_type',type);
 if(error)return json(res,503,{message:'Không lưu được hạn mức.'});
 await auditAdmin('AI_QUOTA_POLICY_UPDATED',cookieToken(req),{accountType:type,previous:old.data,next:{limit:b.limit,period:b.period,enabled:b.enabled}});
 return json(res,200,{message:'Đã cập nhật hạn mức phía server.'});
}
