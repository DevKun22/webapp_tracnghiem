import { useCallback, useEffect, useState } from 'react';
type State = {ai_runtime_mode:'spark'|'blaze';tutor_enabled:boolean;firebase_diagnostic_enabled:boolean;firebase_learner_enabled:boolean;updated_at:string|null};
export function AIControlPanel({openProviders,openFirebase}:{openProviders:()=>void;openFirebase:()=>void}) {
 const [value,setValue]=useState<State|null>(null);
 const [draft,setDraft]=useState({ai_runtime_mode:'spark' as 'spark'|'blaze',tutor_enabled:false,firebase_diagnostic_enabled:true,firebase_learner_enabled:false});
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const load=useCallback(async()=>{
  const r=await fetch('/api/admin/ai-control',{credentials:'same-origin',cache:'no-store'});
  const data=await r.json() as {control?:State;message?:string};
  if(!r.ok||!data.control)throw new Error(data.message||'Không tải được công tắc. Kiểm tra migration 12.');
  setValue(data.control);setDraft({ai_runtime_mode:data.control.ai_runtime_mode,tutor_enabled:data.control.tutor_enabled,firebase_diagnostic_enabled:data.control.firebase_diagnostic_enabled,firebase_learner_enabled:data.control.firebase_learner_enabled});
 },[]);
 useEffect(()=>{void load().catch(e=>setNotice(e instanceof Error?e.message:'Không tải được trạng thái.'))},[load]);
 async function save(){setBusy(true);setNotice('');try{
  const r=await fetch('/api/admin/ai-control',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});
  const data=await r.json() as {message?:string;control?:State};
  if(!r.ok)throw new Error(data.message||'Không lưu được công tắc.');
  await load();setNotice('Đã lưu công tắc trên server.');
 }catch(e){setNotice(e instanceof Error?e.message:'Không lưu được công tắc.');}finally{setBusy(false)}}
 return <section className="dk-admin-panel" aria-label="Điều khiển hệ thống AI">
  <div className="dk-panel-title"><div><span className="dk-section-eyebrow">BẬT / TẮT PHÍA SERVER</span><h2>Điều khiển AI Tutor</h2></div><span className={'dk-status-chip '+(value?.tutor_enabled?'dk-chip-success':'dk-chip-warning')}>{value?.tutor_enabled?'Đang cho phép':'Đang tắt'}</span></div>
  <p>Công tắc AI Tutor kiểm tra lại trong <strong>mỗi yêu cầu tại Gateway</strong>. Firebase AI Logic và Google AI Studio là hai kết nối độc lập.</p>
  <fieldset style={{border:'1px solid var(--border, #dbe4f0)',borderRadius:12,padding:'14px 16px',marginBottom:16}}>
    <legend style={{fontWeight:700}}>Chế độ vận hành AI</legend>
    <label style={{display:'block',marginBottom:10}}><input type="radio" name="ai-runtime-mode" checked={draft.ai_runtime_mode==='spark'} onChange={()=>setDraft(d=>({...d,ai_runtime_mode:'spark',firebase_learner_enabled:false,tutor_enabled:false}))}/> <strong>Spark — Học tập / Tiết kiệm</strong></label>
    <p className="dk-ai-muted">Firebase AI Logic và App Check được dùng để thử Gemini trong Admin. AI Tutor cho người học chỉ hoạt động khi Google AI Studio hoặc OpenAI phía server có key được xác minh; không cần nâng Firebase lên Blaze. Không bật Firebase SDK trực tiếp cho học viên vì quota có thể bị vượt qua.</p>
    <label style={{display:'block',marginTop:12}}><input type="radio" name="ai-runtime-mode" checked={draft.ai_runtime_mode==='blaze'} onChange={()=>setDraft(d=>({...d,ai_runtime_mode:'blaze',firebase_learner_enabled:false,tutor_enabled:false}))}/> <strong>Blaze — Firebase-first có Guard</strong></label>
    <p className="dk-ai-muted">Chỉ dùng khi Firebase project đã thật sự nâng lên Blaze, Cloud Function bảo vệ quota đã triển khai và vượt qua kiểm thử chặn truy cập trực tiếp. Chuyển chế độ tại Dashboard KHÔNG thay đổi gói thanh toán Firebase.</p>
  </fieldset>
  <div className="dk-ai-control-row"><label><input type="checkbox" checked={draft.tutor_enabled} onChange={e=>setDraft(d=>({...d,tutor_enabled:e.target.checked}))}/> Cho phép AI Tutor phục vụ người học</label></div>
  <p className="dk-ai-muted">Firebase cho người học chỉ được bật sau khi Cloud Function kiểm soát quota đã triển khai và được nghiệm thu. Không cần Gemini API Key riêng nếu dùng đường Firebase.</p>
  <div className="dk-ai-control-row"><label><input type="checkbox" disabled={draft.ai_runtime_mode!=='blaze'} checked={draft.firebase_learner_enabled} onChange={e=>setDraft(d=>({...d,firebase_learner_enabled:e.target.checked}))}/> Sử dụng Firebase AI Logic cho người học (chỉ Blaze có Cloud Function bảo vệ)</label></div>
  <div className="dk-ai-control-row"><label><input type="checkbox" checked={draft.firebase_diagnostic_enabled} onChange={e=>setDraft(d=>({...d,firebase_diagnostic_enabled:e.target.checked}))}/> Cho phép công cụ kiểm tra Firebase của Admin</label></div>
  <p className="dk-ai-muted">Công tắc này quản lý công cụ kiểm tra trong Admin; không phải nút cấp quyền gọi Firebase cho người học.</p>
  <div className="dk-admin-actions"><button disabled={busy||!value} onClick={()=>void save()}>{busy?'Đang lưu…':'Lưu công tắc hệ thống'}</button><button className="dk-admin-secondary" onClick={openFirebase}>Kiểm tra Firebase</button><button className="dk-admin-secondary" onClick={openProviders}>Cấu hình API Gateway</button></div>
  {notice&&<p role="status">{notice}</p>}
  <p className="dk-ai-muted">Spark là chế độ học tập mặc định; để AI Tutor hoạt động trong Spark cần xác minh API key Google AI Studio tại Gateway. Blaze cần cấu hình Google Cloud Billing và bộ bảo vệ Cloud Function (Preview). Bản thân công tắc không thay đổi gói phí Firebase.</p>
 </section>;
}
