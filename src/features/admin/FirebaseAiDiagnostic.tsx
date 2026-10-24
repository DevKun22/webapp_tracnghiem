import { useState } from 'react';

type Step = { name: string; status: 'pending' | 'ok' | 'error'; detail: string };
const initial: Step[] = [
  { name: 'Firebase Web SDK', status: 'pending', detail: 'Chưa kiểm tra' },
  { name: 'Firebase App Check', status: 'pending', detail: 'Chưa kiểm tra' },
  { name: 'Gemini qua Firebase AI Logic', status: 'pending', detail: 'Chưa kiểm tra' },
];
const setting = (key: string) => String(import.meta.env[key] || '').trim();

export function FirebaseAiDiagnostic() {
  const [steps, setSteps] = useState<Step[]>(initial);
  const [running, setRunning] = useState(false);
  const [model, setModel] = useState(setting('VITE_FIREBASE_GEMINI_MODEL') || 'gemini-3.5-flash-lite');
  const [answer, setAnswer] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  function update(index: number, status: Step['status'], detail: string) {
    setSteps(prev => prev.map((step, i) => i === index ? { ...step, status, detail } : step));
  }
  async function run() {
    if (running) return;
    setRunning(true); setSteps(initial); setAnswer(''); const startedAt = performance.now(); setElapsedMs(null);
    const fields = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID', 'VITE_RECAPTCHA_ENTERPRISE_SITE_KEY'];
    try {
      const missing = fields.filter(k => !setting(k) || setting(k).startsWith('YOUR_'));
      if (missing.length) throw new Error(`Thiếu cấu hình: ${missing.join(', ')}`);
      const { initializeApp, getApps, getApp } = await import('firebase/app');
      const { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } = await import('firebase/app-check');
      const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
      const app = getApps().length ? getApp() : initializeApp({
        apiKey: setting('VITE_FIREBASE_API_KEY'),
        authDomain: setting('VITE_FIREBASE_AUTH_DOMAIN') || undefined,
        projectId: setting('VITE_FIREBASE_PROJECT_ID'),
        appId: setting('VITE_FIREBASE_APP_ID'),
        messagingSenderId: setting('VITE_FIREBASE_MESSAGING_SENDER_ID') || undefined,
        storageBucket: setting('VITE_FIREBASE_STORAGE_BUCKET') || undefined,
      });
      update(0, 'ok', `Đã khởi tạo Firebase project ${app.options.projectId ?? ''}`);
      // Debug mode is never enabled on a deployed site; browser console will display
      // a debug token that must be enrolled manually in Firebase Console.
      if (import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        (globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      let appCheck;
      try {
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaEnterpriseProvider(setting('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY')),
          isTokenAutoRefreshEnabled: true,
        });
        const result = await getToken(appCheck, false);
        if (!result.token) throw new Error('Không nhận được token App Check.');
        update(1, 'ok', 'Đã nhận token App Check (không hiển thị token).');
      } catch (err) {
        update(1, 'error', err instanceof Error ? err.message : 'App Check không khả dụng.');
        update(2, 'error', 'Chưa gọi Gemini vì App Check chưa thành công.');
        return;
      }
      try {
        const ai = getAI(app, { backend: new GoogleAIBackend() });
        const guardActive = setting('VITE_FIREBASE_LEARNER_GUARDED') === 'true';
        let testPrompt='Hãy trả lời đúng một từ: OK';
        if(guardActive){
          const grant=await fetch('/api/admin/firebase-grant',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}'});
          const data=await grant.json() as {signedPrompt?:string;message?:string};
          if(!grant.ok||!data.signedPrompt)throw new Error(data.message||'Không thể tạo yêu cầu kiểm tra an toàn.');
          testPrompt=data.signedPrompt;
        }
        const generativeModel = getGenerativeModel(ai, { model: guardActive?'gemini-3.5-flash-lite':model.trim(), generationConfig: { maxOutputTokens: 1024 } });
        const response = await generativeModel.generateContent(testPrompt);
        const text = response.response.text();
        if (!text.trim()) throw new Error('Gemini trả về phản hồi rỗng.');
        update(2, 'ok', `Gemini đã phản hồi thật với model ${model.trim()}.`);
        setAnswer(text.slice(0, 400));
      } catch (err) {
        update(2, 'error', err instanceof Error ? err.message : 'Không gọi được Gemini.');
      }
    } catch (err) {
      update(0, 'error', err instanceof Error ? err.message : 'Không khởi tạo được Firebase.');
      update(1, 'error', 'Chưa kiểm tra.');
      update(2, 'error', 'Chưa kiểm tra.');
    } finally {
      setElapsedMs(Math.round(performance.now() - startedAt));
      setRunning(false);
    }
  }
  return <section className="dk-admin-panel" aria-live="polite">
    <div className="dk-panel-title"><div><span className="dk-section-eyebrow">KIỂM TRA KỸ THUẬT</span><h2>Firebase AI Logic</h2></div><span className="dk-status-chip dk-chip-neutral">Chỉ dành cho Admin</span></div>
    <p>Chẩn đoán Firebase AI Logic trực tiếp từ trình duyệt Admin. Đây không phải trạng thái cấp phép AI Tutor trên server.</p>
    <div className="dk-ai-control-row"><label htmlFor="firebase-ai-model">Model Gemini cần thử</label>{' '}
    <input id="firebase-ai-model" value={model} onChange={e => setModel(e.target.value)} style={{ maxWidth: 260 }} />{' '}
    <button disabled={running || !model.trim()} onClick={() => void run()}>{running ? 'Đang kiểm tra…' : 'Kiểm tra kết nối Firebase & Gemini'}</button></div>
    <ul className="dk-ai-steps" style={{ listStyle: 'none', padding: 0 }}>
      {steps.map(step => <li key={step.name} style={{ margin: '10px 0' }}>
        <strong>{step.status === 'ok' ? '✓' : step.status === 'error' ? '✕' : '○'} {step.name}</strong>: {step.detail}
      </li>)}
    </ul>
    {elapsedMs !== null && <p className="dk-ai-muted">Thời gian kiểm tra: {(elapsedMs / 1000).toFixed(1)} giây.</p>}
    {answer && <p className="dk-ai-test-answer"><strong>Phản hồi thực tế:</strong> {answer}</p>}
    <p style={{ fontSize: 13 }}>Localhost: nếu App Check báo token chưa được đăng ký, mở DevTools Console, lấy debug token và đăng ký tại Firebase Console → App Check → Manage debug tokens. Không chia sẻ token. Kiểm tra này chưa thay thế AI Gateway/kiểm tra quota của người học.</p>
  </section>;
}
