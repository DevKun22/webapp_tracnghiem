export type AIQuota={accountType:'guest'|'verified'|'admin';period:'lifetime'|'daily'|'weekly'|'monthly';limit:number;used:number;remaining:number;enabled:boolean;blocked:boolean;resetAt:string|null};
const periods:Record<AIQuota['period'],string>={lifetime:'tổng cộng',daily:'mỗi ngày',weekly:'mỗi tuần',monthly:'mỗi tháng'};
export function AIQuotaBar({quota,loading}:{quota:AIQuota|null;loading:boolean}){
 if(loading&&!quota)return <div className="dk-ai-quota" role="status">Đang tải hạn mức AI…</div>;
 if(!quota)return <div className="dk-ai-quota" role="status">Chưa lấy được hạn mức AI. Vui lòng thử lại.</div>;
 const used=Math.max(0,quota.used),max=Math.max(0,quota.limit),remaining=Math.max(0,quota.remaining);
 return <div className="dk-ai-quota" aria-label="Lượt sử dụng trợ giảng AI">
  <div className="dk-ai-quota-head"><strong>Lượt AI còn lại</strong><b>{remaining} / {max}</b></div>
  <div className="dk-ai-quota-track" role="progressbar" aria-valuemin={0} aria-valuemax={max||1} aria-valuenow={Math.min(used,max)} aria-label="Lượt AI đã sử dụng"><div style={{width:`${max?Math.min(100,used/max*100):100}%`}}/></div>
  <div className="dk-ai-quota-foot"><span>Đã dùng {used} · {periods[quota.period]}</span>{quota.resetAt&&<span>Làm mới: {new Date(quota.resetAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>}</div>
  {!quota.enabled&&<p className="dk-ai-quota-warning">Quyền sử dụng AI đang bị tạm dừng.</p>}
  {quota.enabled&&remaining===0&&<p className="dk-ai-quota-warning">Bạn đã hết lượt AI. Vẫn có thể sao chép prompt để hỏi AI bên ngoài.</p>}
  {quota.enabled&&remaining>0&&remaining<=3&&<p className="dk-ai-quota-warning">Bạn sắp hết lượt AI.</p>}
 </div>;
}
