import {checkPostOrigin,clearAdminCookie,json,type Request,type Response} from '../../server/admin-shared.js';
export default async function handler(req:Request,res:Response){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{message:'Phương thức không được hỗ trợ.'});}
 if(!checkPostOrigin(req,res))return;
 clearAdminCookie(res);
 return json(res,200,{message:'Đã đóng phiên quản trị trên trình duyệt này.'});
}
