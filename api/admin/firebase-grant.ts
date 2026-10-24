import {createHmac,createHash,randomUUID} from 'node:crypto';
import {authorize,cookieToken,checkPostOrigin,json,service,type Request,type Response} from '../../server/admin-shared.js';
import {readAIControl} from '../../server/ai-control.js';
export default async function handler(req:Request,res:Response){
  if(req.method!=='POST')return json(res,405,{message:'Phương thức không hỗ trợ.'});
  if(!checkPostOrigin(req,res))return;
  if(!await authorize(req,res))return;
  const control=await readAIControl();
  if(!control.firebase_diagnostic_enabled)return json(res,403,{message:'Đã tắt kiểm tra Firebase.'});
  const secret=process.env.AI_FIREBASE_GATE_SECRET;
  if(!secret||Buffer.byteLength(secret)<32)return json(res,503,{message:'Chưa cấu hình bảo vệ Firebase.'});
  const token=cookieToken(req),db=service();
  const {data:{user}}=await db!.auth.getUser(token);
  if(!user)return json(res,401,{message:'Phiên quản trị không hợp lệ.'});
  const prompt='Hãy trả lời đúng một từ: OK';
  const payload={v:1,uid:user.id,qid:'admin-diagnostic',mode:'quick',rid:randomUUID(),guest:false,diag:true,exp:Date.now()+60000,sha:createHash('sha256').update(prompt).digest('hex')};
  const raw=Buffer.from(JSON.stringify(payload)).toString('base64url');
  res.setHeader('Cache-Control','no-store');
  return json(res,200,{signedPrompt:`DKG1.${raw}.${createHmac('sha256',secret).update(raw).digest('base64url')}\n${prompt}`,model:'gemini-3.5-flash-lite'});
}
