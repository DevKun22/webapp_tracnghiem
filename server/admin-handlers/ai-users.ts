import {authorize,auditAdmin,checkPostOrigin,cookieToken,json,service,type Request,type Response} from '../admin-shared.js';
import {getQuota} from '../ai-quota.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validPeriod=(x:unknown)=>['lifetime','daily','weekly','monthly'].includes(String(x));
const validLimit=(x:unknown)=>x===null||(Number.isInteger(x)&&Number(x)>=0&&Number(x)<=10000);
export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method||''))return json(res,405,{message:'Phương thức không hỗ trợ.'});
 if(req.method==='POST'&&!checkPostOrigin(req,res))return;
 if(!await authorize(req,res))return;
 const db=service();if(!db)return json(res,503,{message:'Chưa kết nối hệ thống.'});
 if(req.method==='GET'){
  // Bounded reporting over latest activity. Not a full historical analytics service.
  const {data,error}=await db.from('ai_request_reservations').select('user_id,created_at').order('created_at',{ascending:false}).limit(1000);
  if(error)return json(res,503,{message:'Không tải được thống kê AI. Kiểm tra migration 11.'});
  const grouped=new Map<string,{count:number,lastUsedAt:string;last7Days:number;today:number}>();
  const now=Date.now(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  for(const row of data||[]){const t=new Date(row.created_at).getTime();const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(t);const current=grouped.get(row.user_id)||{count:0,lastUsedAt:row.created_at,last7Days:0,today:0};current.count++;if(now-t<7*86400000)current.last7Days++;if(day===today)current.today++;grouped.set(row.user_id,current);}
  const users=[];
  for(const [id,stats] of [...grouped.entries()].slice(0,50)){
   const [profile,quota,override]=await Promise.all([db.auth.admin.getUserById(id),getQuota(id),db.from('ai_user_quota_overrides').select('blocked,limit_count,period').eq('user_id',id).maybeSingle()]);
   users.push({id,email:profile.data.user?.email||null,isAnonymous:profile.data.user?.is_anonymous||false,quota,override:override.data||null,...stats});
  }
  return json(res,200,{users,sampledRecords:(data||[]).length,limited:true,message:'Thống kê gần đây, tối đa 1.000 lượt và 50 tài khoản. Tổng lịch sử cần hệ thống phân tích riêng.'});
 }
 const b=req.body as {userId?:unknown;blocked?:unknown;limit?:unknown;period?:unknown}|undefined;
 if(!b||typeof b.userId!=='string'||!uuid.test(b.userId)||typeof b.blocked!=='boolean'||!validLimit(b.limit)||!(b.period===null||validPeriod(b.period)))return json(res,400,{message:'Cấu hình tài khoản không hợp lệ.'});
 const target=await db.auth.admin.getUserById(b.userId);if(target.error||!target.data.user)return json(res,404,{message:'Không tìm thấy tài khoản.'});
 const previous=await db.from('ai_user_quota_overrides').select('blocked,limit_count,period').eq('user_id',b.userId).maybeSingle();
 if(previous.error)return json(res,503,{message:'Không đọc được chính sách tài khoản.'});
 const {error}=await db.from('ai_user_quota_overrides').upsert({user_id:b.userId,blocked:b.blocked,limit_count:b.limit,period:b.period,updated_at:new Date().toISOString()},{onConflict:'user_id'});
 if(error)return json(res,503,{message:'Không lưu được cấu hình tài khoản.'});
 await auditAdmin('AI_USER_QUOTA_UPDATED',cookieToken(req),{userId:b.userId,previous:previous.data,next:{blocked:b.blocked,limit:b.limit,period:b.period}});
 return json(res,200,{message:'Đã cập nhật quyền dùng AI của tài khoản.'});
}
