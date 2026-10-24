import {useCallback,useEffect,useState} from 'react';
type Period='lifetime'|'daily'|'weekly'|'monthly';
type Policy={account_type:'guest'|'verified'|'admin';limit_count:number;period:Period;enabled:boolean;updated_at:string};
type Quota={remaining:number;used:number;limit:number;period:Period;enabled:boolean;accountType:string};
type UserRow={id:string;email:string|null;isAnonymous:boolean;today:number;last7Days:number;count:number;lastUsedAt:string;quota:Quota|null;override:{blocked:boolean;limit_count:number|null;period:Period|null}|null};
const title:Record<Policy['account_type'],string>={guest:'Khách (Guest)',verified:'Email đã xác minh',admin:'Quản trị viên'};
const options=[{value:'lifetime',label:'Tổng cộng'},{value:'daily',label:'Mỗi ngày'},{value:'weekly',label:'Mỗi tuần'},{value:'monthly',label:'Mỗi tháng'}] as const;
export function AIQuotaManagement(){
 const [policies,setPolicies]=useState<Policy[]>([]),[users,setUsers]=useState<UserRow[]>([]),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[search,setSearch]=useState('');
 const [chosen,setChosen]=useState<UserRow|null>(null),[blocked,setBlocked]=useState(false),[customLimit,setCustomLimit]=useState(''),[customPeriod,setCustomPeriod]=useState<Period|'inherit'>('inherit');
 const load=useCallback(async()=>{
  setLoading(true);
  try{const [a,b]=await Promise.all([fetch('/api/admin/ai-quotas',{credentials:'same-origin',cache:'no-store'}),fetch('/api/admin/ai-users',{credentials:'same-origin',cache:'no-store'})]);
   const x=await a.json() as {policies?:Policy[];message?:string};const y=await b.json() as {users?:UserRow[];message?:string};
   if(!a.ok||!b.ok)throw new Error(x.message||y.message||'Không thể tải quản lý hạn mức.');
   setPolicies(x.policies||[]);setUsers(y.users||[]);
  }catch(e){setNotice(e instanceof Error?e.message:'Không tải được thống kê AI.');}finally{setLoading(false)}
 },[]);
 useEffect(()=>{void load()},[load]);
 const post=async(url:string,payload:unknown)=>{const r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json() as {message?:string};if(!r.ok)throw new Error(d.message||'Không thể lưu thay đổi.');return d};
 const savePolicy=async(p:Policy)=>{setBusy(true);try{const d=await post('/api/admin/ai-quotas',{accountType:p.account_type,limit:p.limit_count,period:p.period,enabled:p.enabled});setNotice(d.message||'Đã lưu.');await load();}catch(e){setNotice(e instanceof Error?e.message:'Không lưu được hạn mức.')}finally{setBusy(false)}};
 const choose=(u:UserRow)=>{setChosen(u);setBlocked(Boolean(u.override?.blocked));setCustomLimit(u.override?.limit_count==null?'':String(u.override.limit_count));setCustomPeriod(u.override?.period||'inherit');};
 const saveUser=async()=>{if(!chosen)return;const n=customLimit.trim()===''?null:Number(customLimit);if(n!==null&&(!Number.isInteger(n)||n<0||n>10000)){setNotice('Hạn mức cá nhân phải là số nguyên từ 0 đến 10.000.');return}setBusy(true);try{const d=await post('/api/admin/ai-users',{userId:chosen.id,blocked,limit:n,period:customPeriod==='inherit'?null:customPeriod});setNotice(d.message||'Đã lưu.');setChosen(null);await load();}catch(e){setNotice(e instanceof Error?e.message:'Không lưu được tài khoản.')}finally{setBusy(false)}};
 const filtered=users.filter(u=>(u.email||u.id).toLowerCase().includes(search.toLowerCase()));
 return <section className="dk-admin-panel" aria-label="Quản lý hạn mức và tài khoản sử dụng AI">
  <div className="dk-panel-title"><div><span className="dk-section-eyebrow">HẠN MỨC PHÍA SERVER</span><h2>Hạn mức & tài khoản dùng AI</h2></div><button disabled={busy||loading} onClick={()=>void load()}>Cập nhật thống kê</button></div>
  <p>Thay đổi hạn mức theo loại tài khoản, sau đó điều chỉnh riêng hoặc tạm khóa AI của từng người học. Quy tắc được kiểm tra ở database; không tin tưởng số lượt từ trình duyệt.</p>
  <p role="status">{loading?'Đang tải dữ liệu…':notice}</p>
  <div className="dk-quota-policy-grid">{policies.map(p=><div className="dk-quota-policy" key={p.account_type}>
    <strong>{title[p.account_type]}</strong>
    <label>Số lượt AI <input type="number" min={0} max={10000} value={p.limit_count} onChange={e=>setPolicies(old=>old.map(x=>x.account_type===p.account_type?{...x,limit_count:Number(e.target.value)}:x))}/></label>
    <label>Chu kỳ <select value={p.period} onChange={e=>setPolicies(old=>old.map(x=>x.account_type===p.account_type?{...x,period:e.target.value as Period}:x))}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
    <label><input type="checkbox" checked={p.enabled} onChange={e=>setPolicies(old=>old.map(x=>x.account_type===p.account_type?{...x,enabled:e.target.checked}:x))}/> Cho phép nhóm sử dụng AI</label>
    <button disabled={busy||!Number.isInteger(p.limit_count)||p.limit_count<0||p.limit_count>10000} onClick={()=>void savePolicy(p)}>Lưu nhóm</button>
  </div>)}</div>
  <div className="dk-panel-title" style={{marginTop:24}}><div><span className="dk-section-eyebrow">THỐNG KÊ GẦN ĐÂY</span><h2>Danh sách tài khoản đã dùng AI</h2></div><input aria-label="Tìm email hoặc ID" placeholder="Tìm email / ID…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
  <p className="dk-ai-muted">Danh sách tối đa 50 tài khoản có hoạt động trong 1.000 bản ghi gần nhất. Không phải thống kê toàn bộ lịch sử. Lượt sử dụng bao gồm yêu cầu đã được tiếp nhận, kể cả khi provider gặp lỗi.</p>
  <div className="dk-user-table-wrap"><table className="dk-user-table"><thead><tr><th>Tài khoản</th><th>Hôm nay</th><th>7 ngày</th><th>Còn lại</th><th>Trạng thái</th><th>Quản lý</th></tr></thead><tbody>{filtered.map(u=><tr key={u.id}><td><strong>{u.email||'Khách ẩn danh'}</strong><div className="dk-ai-muted">{u.id.slice(0,8)}…</div></td><td>{u.today}</td><td>{u.last7Days}</td><td>{u.quota?`${u.quota.remaining}/${u.quota.limit}`:'—'}</td><td>{u.quota?.enabled?'Được phép':'Tạm dừng'}</td><td><button disabled={busy} onClick={()=>choose(u)}>Điều chỉnh</button></td></tr>)}</tbody></table>{!filtered.length&&!loading&&<p>Chưa có tài khoản sử dụng AI phù hợp.</p>}</div>
  {chosen&&<div className="dk-quota-user-action" role="group" aria-label="Điều chỉnh tài khoản AI"><strong>{chosen.email||`Guest ${chosen.id.slice(0,8)}`}</strong><div className="dk-quota-user-action-grid">
    <label><input type="checkbox" checked={blocked} onChange={e=>setBlocked(e.target.checked)}/> Tạm khóa AI</label>
    <label>Hạn mức riêng (để trống để kế thừa)<input type="number" min={0} max={10000} value={customLimit} onChange={e=>setCustomLimit(e.target.value)} placeholder="Theo nhóm"/></label>
    <label>Chu kỳ riêng<select value={customPeriod} onChange={e=>setCustomPeriod(e.target.value as Period|'inherit')}><option value="inherit">Theo nhóm</option>{options.map(o=><option value={o.value} key={o.value}>{o.label}</option>)}</select></label>
   </div><div className="dk-admin-actions"><button disabled={busy} onClick={()=>void saveUser()}>Lưu quyền tài khoản</button><button disabled={busy} className="dk-admin-secondary" onClick={()=>setChosen(null)}>Hủy</button></div></div>}
 </section>;
}
