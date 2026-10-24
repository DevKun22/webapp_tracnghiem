import { service } from './admin-shared.js';
export type Quota = {accountType:'guest'|'verified'|'admin';period:'lifetime'|'daily'|'weekly'|'monthly';limit:number;used:number;remaining:number;enabled:boolean;blocked:boolean;resetAt:string|null};
export async function getQuota(userId:string):Promise<Quota|null>{
 const db=service();if(!db)return null;
 const {data,error}=await db.rpc('ai_quota_snapshot_v2916',{p_user_id:userId});
 if(error||!data)return null;
 return data as Quota;
}
