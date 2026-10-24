import {json,service,type Request,type Response} from '../../server/admin-shared.js';
import {getQuota} from '../../server/ai-quota.js';
export default async function handler(req:Request,res:Response){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return json(res,405,{message:'Phương thức không hỗ trợ.'});
 const bearer=req.headers.authorization;
 if(!bearer?.startsWith('Bearer '))return json(res,401,{message:'Bạn cần đăng nhập để xem lượt AI.'});
 const db=service();if(!db)return json(res,503,{message:'Chưa thể tải hạn mức AI.'});
 const {data:{user},error}=await db.auth.getUser(bearer.slice(7));
 if(error||!user)return json(res,401,{message:'Phiên đăng nhập đã hết hạn.'});
 const quota=await getQuota(user.id);
 if(!quota)return json(res,503,{message:'Hạn mức AI chưa sẵn sàng. Kiểm tra migration 14.'});
 return json(res,200,{quota});
}
