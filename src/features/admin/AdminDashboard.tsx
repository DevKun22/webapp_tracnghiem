import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { FirebaseAiDiagnostic } from './FirebaseAiDiagnostic';
import { AIControlPanel } from './AIControlPanel';
import { AIQuotaManagement } from './AIQuotaManagement';

type Status = { configured: boolean; connected: boolean; enabled: boolean; provider: string; model: string; source: string; lastCheckedAt: string | null; message: string };
type Phase = 'loading' | 'login' | 'denied' | 'mfa-setup' | 'mfa-verify' | 'ready' | 'error';
export function AdminDashboard() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [notice, setNotice] = useState('Đang kiểm tra quyền quản trị…');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'overview'|'firebase'|'providers'|'control'|'quota'|'security'>('overview');
  const [factorId, setFactorId] = useState('');
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [sessionExpires, setSessionExpires] = useState<number | null>(null);

  const message = (e: unknown) => e instanceof Error ? e.message : 'Không thể hoàn tất yêu cầu.';
  const token = useCallback(async () => {
    if (!supabase) throw new Error('Chưa cấu hình Supabase.');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('Vui lòng đăng nhập bằng tài khoản email để quản trị.');
    return session.access_token;
  }, []);
  const loadStatus = useCallback(async () => {
    const response = await fetch('/api/admin/ai-status', { cache: 'no-store', credentials: 'same-origin' });
    const data = await response.json() as Status & { message?: string };
    if (!response.ok) throw new Error(data.message || 'Không thể tải trạng thái AI.');
    setNotice(data.message);
  }, []);
  const bootstrap = useCallback(async () => {
    const accessToken = await token();
    const resp = await fetch('/api/admin/session', { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { Authorization: `Bearer ${accessToken}` } });
    const result = await resp.json() as { code?: string; message?: string; expiresIn?: number };
    if (!resp.ok) throw new Error(result.message || 'Không thể tạo phiên quản trị.');
    setSessionExpires(Date.now() + (result.expiresIn || 0) * 1000);
    await loadStatus(); setPhase('ready');
  }, [loadStatus, token]);
  const prepare = useCallback(async () => {
    setBusy(true);
    try {
      const accessToken = await token();
      // The server checks current DB role BEFORE any MFA enrollment is offered.
      const roleResp = await fetch('/api/admin/eligibility', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
      const roleJson = await roleResp.json() as { code?: string; message?: string };
      if (!roleResp.ok) {
        setPhase(roleResp.status === 401 ? 'login' : roleResp.status === 403 ? 'denied' : 'error');
        throw new Error(roleJson.message || 'Không thể xác minh quyền quản trị.');
      }
      if (!supabase) throw new Error('Chưa cấu hình Supabase.');
      const { data: aal, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalErr || !aal) throw new Error('Không thể kiểm tra trạng thái MFA.');
      if (aal.currentLevel === 'aal2') { await bootstrap(); return; }
      const { data: factors, error: factorsErr } = await supabase.auth.mfa.listFactors();
      if (factorsErr || !factors) throw new Error('Không thể tải ứng dụng xác thực.');
      const verified = factors.totp.find(x => x.status === 'verified');
      if (verified) { setFactorId(verified.id); setQr(''); setPhase('mfa-verify'); setNotice('Nhập mã trong ứng dụng xác thực để đăng nhập quản trị.'); }
      else { setFactorId(''); setQr(''); setPhase('mfa-setup'); setNotice('Tài khoản quản trị cần thiết lập xác thực hai bước TOTP.'); }
    } catch (e) { setNotice(message(e)); setPhase(p => p === 'loading' ? 'error' : p); }
    finally { setBusy(false); }
  }, [bootstrap, token]);
  useEffect(() => { void prepare(); }, [prepare]);
  async function enroll() {
    if (!supabase) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'DevKunn Admin' });
      if (error || !data?.totp) throw new Error('Không thể bắt đầu thiết lập MFA.');
      setFactorId(data.id); setQr(data.totp.qr_code); setNotice('Quét mã QR bằng ứng dụng xác thực rồi nhập mã sáu chữ số.');
    } catch (e) { setNotice(message(e)); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (!supabase || !factorId) return;
    if (!/^\d{6}$/.test(code)) { setNotice('Vui lòng nhập đúng sáu chữ số.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) throw new Error('Mã xác thực không đúng hoặc đã hết hạn.');
      setCode(''); setQr('');
      // Supabase rotates the session and issues an access JWT with aal2 after MFA.
      await bootstrap();
    } catch (e) { setNotice(message(e)); }
    finally { setBusy(false); }
  }
  async function logoutAdmin() {
    setBusy(true);
    try {
      const r = await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
      if (!r.ok) throw new Error('Không thể đóng phiên quản trị.');
      setPhase('error'); setSessionExpires(null); setNotice('Đã đóng phiên quản trị trên trình duyệt này. Tài khoản học tập vẫn đăng nhập.');
    } catch (e) { setNotice(message(e)); }
    finally { setBusy(false); }
  }
  const ready = phase === 'ready';
  const firebaseConfigured = Boolean(import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_APP_ID && import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY);
  return <main className="dk-admin-page dk-admin-v2913">
    <header className="dk-admin-hero"><div className="dk-admin-hero-top"><a href="/">← Về học tập</a><span className="dk-admin-build">DEVKUNN LEARN · V2.9.16</span></div><h1>Trung tâm quản trị AI</h1><p>Giám sát kết nối, kiểm tra nhà cung cấp và triển khai an toàn.</p></header>
    <div className="dk-admin-metrics" aria-label="Trạng thái hệ thống">
      <div className="dk-admin-metric"><span>Quyền quản trị</span><strong className={ready?'dk-success-text':''}>{ready?'Đã xác thực':'Cần xác minh'}</strong><small>Server RBAC · MFA AAL2</small></div>
      <div className="dk-admin-metric"><span>Firebase Web Config</span><strong className={firebaseConfigured?'dk-success-text':''}>{firebaseConfigured?'Đã khai báo':'Còn thiếu cấu hình'}</strong><small>Không thay thế kiểm tra kết nối thực</small></div>
      <div className="dk-admin-metric"><span>Gemini AI Logic</span><strong>Kiểm tra trong tab Firebase</strong><small>Phản hồi đã được bạn xác minh trên localhost</small></div>
      <div className="dk-admin-metric"><span>AI Tutor production</span><strong className="dk-caution-text">Chưa nghiệm thu</strong><small>Gateway, quota và fallback cần QA</small></div>
    </div>
    <section className="dk-admin-panel dk-admin-session" aria-live="polite">
      <div className="dk-panel-title"><div><span className="dk-section-eyebrow">BẢO MẬT QUẢN TRỊ</span><h2>{ready?'Phiên quản trị đã xác thực':'Đăng nhập và xác minh'}</h2></div><span className={'dk-status-chip '+(ready?'dk-chip-success':'dk-chip-warning')}>{ready?'MFA hoàn tất':'Yêu cầu xác thực'}</span></div>
      <p role="status">{notice}</p>
      {phase==='login'&&<p>Hãy đăng nhập bằng email đã xác minh ở trang học tập, rồi quay lại đây.</p>}
      {phase==='denied'&&<p>Tài khoản hiện tại chưa được cấp role quản trị qua server.</p>}
      {phase==='mfa-setup'&&<><p>Thiết lập TOTP bằng Google Authenticator hoặc Microsoft Authenticator.</p>{!qr&&<button disabled={busy} onClick={()=>void enroll()}>Thiết lập MFA</button>}{qr&&<><p>Quét mã QR; không chia sẻ mã này.</p><img src={qr} alt="Mã QR thiết lập MFA riêng tư" width={192} height={192}/></>}</>}
      {(phase==='mfa-verify'||(phase==='mfa-setup'&&Boolean(qr)))&&<div className="dk-ai-control-row"><label htmlFor="admin-totp-code">Mã 6 chữ số</label><input id="admin-totp-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="000000" style={{maxWidth:130}}/><button disabled={busy||code.length!==6} onClick={()=>void verify()}>Xác minh MFA</button></div>}
      <div className="dk-admin-actions">{!ready?<button disabled={busy} onClick={()=>void prepare()}>{busy?'Đang kiểm tra…':'Kiểm tra trạng thái đăng nhập'}</button>:<><span className="dk-admin-session-info">{sessionExpires?`Phiên hết hạn: ${new Date(sessionExpires).toLocaleTimeString('vi-VN')}`:'Phiên đã xác thực'}</span><button disabled={busy} onClick={()=>void prepare()}>Làm mới phiên</button><button className="dk-admin-secondary" disabled={busy} onClick={()=>void logoutAdmin()}>Đóng phiên</button></>}</div>
    </section>
    {ready&&<>
      <nav className="dk-admin-tabs" aria-label="Mục quản trị AI">{([{id:'overview',label:'Tổng quan'},{id:'firebase',label:'Firebase & Gemini'},{id:'providers',label:'Google AI Studio & OpenAI'},{id:'control',label:'Bật / Tắt AI Tutor'},{id:'quota',label:'Hạn mức & Người dùng'},{id:'security',label:'Triển khai production'}] as const).map(t=><button type="button" key={t.id} className={tab===t.id?'active':''} aria-current={tab===t.id?'page':undefined} onClick={()=>setTab(t.id)}>{t.label}</button>)}</nav>
      {tab==='overview'&&<section className="dk-admin-panel"><div className="dk-panel-title"><div><span className="dk-section-eyebrow">BẢNG ĐIỀU KHIỂN</span><h2>Tổng quan và việc cần làm</h2></div></div><p>Đường Gemini qua Firebase đã được kiểm thử thủ công thành công với <code>gemini-3.5-flash-lite</code>. Tuy nhiên, kiểm thử trên localhost không chứng minh production đã sẵn sàng.</p><div className="dk-admin-next-grid"><article><strong>01 · Firebase AI Logic</strong><p>Chạy lại chẩn đoán bằng cấu hình mới, nghiệm thu App Check trên domain Vercel thực.</p><button onClick={()=>setTab('firebase')}>Mở kiểm tra Firebase</button></article><article><strong>02 · Google AI Studio và OpenAI</strong><p>Kiểm tra provider phía server và migration. Gemini Firebase không dùng chung trạng thái với Gemini API key server.</p><button onClick={()=>setTab('providers')}>Quản lý nhà cung cấp</button></article><article><strong>03 · Production gate</strong><p>Xác minh quota, dữ liệu riêng, giám sát chi phí, build và kịch bản lỗi trước khi bật AI cho người học.</p><button onClick={()=>setTab('security')}>Xem checklist</button></article></div></section>}
      {tab==='firebase'&&<FirebaseAiDiagnostic/>}
      {tab==='providers'&&<ProviderManager/>}
      {tab==='control'&&<AIControlPanel openProviders={()=>setTab('providers')} openFirebase={()=>setTab('firebase')}/>}
      {tab==='quota'&&<AIQuotaManagement/>}
      {tab==='security'&&<section className="dk-admin-panel"><div className="dk-panel-title"><div><span className="dk-section-eyebrow">RELEASE GATE</span><h2>Điều kiện triển khai production</h2></div><span className="dk-status-chip dk-chip-warning">Chưa đạt toàn bộ</span></div><ul className="dk-production-checklist"><li><strong>Build & tests:</strong> npm run build, npm test, check:v2913 và kiểm thử hồi quy đạt.</li><li><strong>Firebase:</strong> App Check token hợp lệ trên domain Vercel thật, không dùng debug token.</li><li><strong>Enforcement:</strong> chỉ bật sau khi theo dõi request/token production; Firebase yêu cầu enforcement theo thông báo từ 02/11/2026.</li><li><strong>Quyền & quota:</strong> mọi lượt AI của người học phải đi qua backend; Firebase AI Logic trình duyệt không thể tự áp dụng quota Supabase.</li><li><strong>Chi phí:</strong> đặt budget/alert Google, giới hạn rate và theo dõi timeout, usage.</li><li><strong>Fallback:</strong> nghiệm thu khi Gemini 503/timeout, cả hai provider lỗi và người học hết quota.</li><li><strong>Riêng tư:</strong> không gửi tài liệu cá nhân không được phép; kiểm tra RLS và log không chứa key.</li><li><strong>Bảo mật phiên:</strong> hoàn thiện revocation và cơ chế session/refresh trước khi đánh giá hệ thống đạt bảo mật production đầy đủ.</li></ul><p className="dk-ai-muted">Không tự động bật AI cho toàn bộ người học chỉ nhờ kết quả thử OK ở localhost.</p></section>}
    </>}
  </main>;
}

type ProviderEntry = {provider:'gemini'|'openai';model:string;enabled:boolean;configured:boolean;connected:boolean;lastCheckedAt:string|null};
function ProviderManager(){
 const [items,setItems]=useState<ProviderEntry[]>([]);
 const [keys,setKeys]=useState<Record<string,string>>({});
 const [notice,setNotice]=useState('Đang tải nhà cung cấp AI…');
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const r=await fetch('/api/admin/ai-providers',{credentials:'same-origin',cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.message||'Không thể tải nhà cung cấp.');setItems(data.providers)},[]);
 useEffect(()=>{void load().catch(e=>setNotice(String(e)))},[load]);
 const update=(provider:string,patch:Partial<ProviderEntry>)=>setItems(old=>old.map(x=>x.provider===provider?{...x,...patch}:x));
 async function send(item:ProviderEntry,action:'save'|'check'){
  setBusy(true);setNotice('Đang kiểm tra kết nối thực tế…');
  try{const r=await fetch('/api/admin/ai-providers',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,provider:item.provider,model:item.model,enabled:item.enabled,...(keys[item.provider]?.trim()?{apiKey:keys[item.provider].trim()}: {})})});const data=await r.json();if(!r.ok)throw new Error(data.message||'Kết nối thất bại.');setKeys(v=>({...v,[item.provider]:''}));await load();setNotice(`${item.provider}: ${data.message}`)}catch(e){setNotice(e instanceof Error?e.message:'Không thể lưu cấu hình.')}finally{setBusy(false)}
 }
 return <section className="dk-admin-panel"><div className="dk-panel-title"><div><span className="dk-section-eyebrow">GATEWAY SERVER</span><h2>Nhà cung cấp AI — Google AI Studio & OpenAI</h2></div><span className="dk-status-chip dk-chip-neutral">Studio Gemini → OpenAI</span></div><p>Đây là kết nối server-side qua API key, KHÁC với Gemini qua Firebase AI Logic. Nhà cung cấp server dùng để trả lời có quota. Firebase AI Logic ở tab riêng và được kiểm tra độc lập. API key được mã hóa trước khi lưu.</p><p role="status">{notice}</p>{items.map(item=><div key={item.provider} className="dk-provider-card"><div className="dk-provider-heading"><strong>{item.provider==='gemini'?'Google AI Studio · Gemini Gateway':'OpenAI · Dự phòng Gateway'}</strong><span className={'dk-status-chip '+(item.connected?'dk-chip-success':'dk-chip-neutral')}>{item.connected?'Đã xác minh lần trước':'Chưa kết nối'}</span></div><label>Model <input value={item.model} onChange={e=>update(item.provider,{model:e.target.value})}/></label><label>API key mới <input type="password" autoComplete="new-password" value={keys[item.provider]||''} onChange={e=>setKeys(k=>({...k,[item.provider]:e.target.value}))} placeholder="Để trống nếu giữ khóa đã lưu"/></label><label><input type="checkbox" checked={item.enabled} onChange={e=>update(item.provider,{enabled:e.target.checked})}/> Cho phép provider này tham gia Gateway (cần lưu và xác minh)</label><p>{item.configured?'Đã lưu khóa':'Chưa có khóa'} · {item.connected?'Kiểm tra gần nhất thành công':'Chưa xác minh kết nối'} · {item.enabled?'Đang bật':'Đang tắt'}</p><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button disabled={busy} onClick={()=>void send(item,'save')}>Lưu và kiểm tra</button><button disabled={busy||!item.configured} onClick={()=>void send(item,'check')}>Thử kết nối</button></div></div>)}<p>Yêu cầu migration 10_v2913_ai_gateway.sql và AI_SETTINGS_ENCRYPTION_KEY phía server. Khi Gemini không khả dụng, Gateway mới chuyển sang OpenAI nếu OpenAI cũng đã được bật.</p></section>;
}
