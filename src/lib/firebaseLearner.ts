/** AI Tutor Firebase client. Only use with a deployed beforeGenerateContent quota guard. */
const setting=(name:string)=>String(import.meta.env[name]||'').trim();
let initialized=false;
export async function askFirebaseLearner(signedPrompt:string,model:string):Promise<string>{
  if(!setting('VITE_FIREBASE_LEARNER_GUARDED')||setting('VITE_FIREBASE_LEARNER_GUARDED')!=='true')throw new Error('AI Trợ giảng Firebase chưa được kích hoạt.');
  const {initializeApp,getApps,getApp}=await import('firebase/app');
  const {initializeAppCheck,ReCaptchaEnterpriseProvider}=await import('firebase/app-check');
  const {getAI,getGenerativeModel,GoogleAIBackend}=await import('firebase/ai');
  if(import.meta.env.DEV&&['localhost','127.0.0.1'].includes(window.location.hostname)){
    (globalThis as typeof globalThis&{FIREBASE_APPCHECK_DEBUG_TOKEN?:boolean}).FIREBASE_APPCHECK_DEBUG_TOKEN=true;
  }
  const app=getApps().length?getApp():initializeApp({
    apiKey:setting('VITE_FIREBASE_API_KEY'),authDomain:setting('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId:setting('VITE_FIREBASE_PROJECT_ID'),appId:setting('VITE_FIREBASE_APP_ID'),
    messagingSenderId:setting('VITE_FIREBASE_MESSAGING_SENDER_ID'),storageBucket:setting('VITE_FIREBASE_STORAGE_BUCKET')
  });
  if(!initialized){
    try{initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(setting('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY')),isTokenAutoRefreshEnabled:true});}catch(e){
      if(!((e as {code?:string})?.code==='appCheck/already-initialized'||(e instanceof Error&&e.message.toLowerCase().includes('already initialized'))))throw e;
    }
    initialized=true;
  }
  // App Check SDK injects token automatically when calling AI Logic.
  const ai=getAI(app,{backend:new GoogleAIBackend()});
  const result=await getGenerativeModel(ai,{model,generationConfig:{maxOutputTokens:1024}}).generateContent(signedPrompt);
  const answer=result.response.text().trim();
  if(!answer)throw new Error('AI chưa trả về lời giải.');
  return answer;
}
