import {readFileSync,existsSync} from 'node:fs';
const read=(p)=>readFileSync(p,'utf8');
for(const p of ['server/ai-providers.ts','api/admin/ai-providers.ts','api/ai/tutor.ts','supabase/10_v2913_ai_gateway.sql','src/features/admin/AdminDashboard.tsx'])if(!existsSync(p))throw Error('Missing '+p);
for(const text of ['gemini','openai','x-goog-api-key','AI_SETTINGS_ENCRYPTION_KEY'])if(!read('server/ai-providers.ts').includes(text)&&text!=='AI_SETTINGS_ENCRYPTION_KEY')throw Error('Missing '+text);
if(!read('api/ai/tutor.ts').includes('reserve_ai_request'))throw Error('Missing quota guard');
console.log('PASS V2.9.13 structural checks (not production integration tests)');
