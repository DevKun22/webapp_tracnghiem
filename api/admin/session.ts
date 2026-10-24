import {authorizeToken,checkPostOrigin,json,setAdminCookie,type Request,type Response} from '../../server/admin-shared.js';
/** Exchanges existing Supabase access token for short-lived, HttpOnly admin cookie. */
export default async function handler(req:Request,res:Response){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{message:'Phương thức không được hỗ trợ.'});}
 if(!checkPostOrigin(req,res))return;
 const token=req.headers.authorization?.match(/^Bearer\s+([A-Za-z0-9_.-]+)$/i)?.[1];
 if(!token)return json(res,401,{message:'Thiếu phiên Supabase hợp lệ.'});
 if(!await authorizeToken(token,res))return;
 // Limit cookie lifetime to <= 5 minutes AND verified Supabase JWT expiry.
 try{
  const raw=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8')) as {exp?:number};
  const expiry=Math.floor(Number(raw.exp)||0)-Math.floor(Date.now()/1000);
  const age=Math.min(300,expiry);
  if(!Number.isFinite(age)||age<1)return json(res,401,{message:'Phiên đã hết hạn. Vui lòng đăng nhập lại.'});
  setAdminCookie(res,token,age);
  return json(res,200,{message:'Phiên quản trị đã được xác thực.',expiresIn:age});
 }catch{return json(res,401,{message:'Phiên đăng nhập không hợp lệ.'});}
}
