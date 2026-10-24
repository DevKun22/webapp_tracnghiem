import { service } from './admin-shared.js';
export type AIControl = { ai_runtime_mode: 'spark' | 'blaze'; tutor_enabled: boolean; firebase_diagnostic_enabled: boolean; firebase_learner_enabled: boolean; updated_at: string | null };
export const DISABLED_CONTROL: AIControl = { ai_runtime_mode:'spark', tutor_enabled:false, firebase_diagnostic_enabled:false, firebase_learner_enabled:false, updated_at:null };
/** Fail closed on missing migration or DB errors. This is authoritative for learner requests. */
export async function readAIControl(): Promise<AIControl> {
 const db=service(); if(!db)return DISABLED_CONTROL;
 const {data,error}=await db.from('ai_system_control').select('ai_runtime_mode,tutor_enabled,firebase_diagnostic_enabled,firebase_learner_enabled,updated_at').eq('id',1).maybeSingle();
 if(error||!data)return DISABLED_CONTROL;
 return {ai_runtime_mode:data.ai_runtime_mode==='blaze'?'blaze':'spark',tutor_enabled:data.tutor_enabled===true,firebase_diagnostic_enabled:data.firebase_diagnostic_enabled===true,firebase_learner_enabled:data.firebase_learner_enabled===true,updated_at:data.updated_at||null};
}
