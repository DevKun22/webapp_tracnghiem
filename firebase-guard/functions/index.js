/**
 * FIREBASE AI LOGIC BEFORE GENERATE CONTENT — PREVIEW ONLY.
 * This guard MUST be deployed and verified before learner Firebase mode is enabled.
 * Fail closed for ALL unsigned calls, including manual Admin diagnostics.
 */
import { beforeGenerateContent,HttpsError,geminiV1Beta } from 'firebase-functions/v2/ai';
import { defineSecret } from 'firebase-functions/params';
import { createClient } from '@supabase/supabase-js';
import { verifyPromptEnvelope } from './guard-core.js';

const GATE=defineSecret('AI_FIREBASE_GATE_SECRET');
const DB_URL=defineSecret('SUPABASE_URL');
const SERVICE_KEY=defineSecret('SUPABASE_SERVICE_ROLE_KEY');
const reject=()=>{throw new HttpsError('permission-denied','AI request is not authorized.');};

export const protectDevKunnAI=beforeGenerateContent({secrets:[GATE,DB_URL,SERVICE_KEY]},async(event)=>{
  try{
    // Fail closed across both Firebase AI Logic API variants.
    if(event.data.api!==geminiV1Beta)reject();
    if(!String(event.data.model).endsWith('/gemini-3.5-flash-lite'))reject();
    const request=event.data.request;
    const contents=request?.contents;
    if(!Array.isArray(contents)||contents.length!==1||contents[0]?.role!=='user'||
       !Array.isArray(contents[0]?.parts)||contents[0].parts.length!==1||
       typeof contents[0].parts[0]?.text!=='string')reject();
    const {claims,prompt}=verifyPromptEnvelope(contents[0].parts[0].text,GATE.value());
    const db=createClient(DB_URL.value(),SERVICE_KEY.value(),{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:control,error:controlError}=await db.from('ai_system_control').select('tutor_enabled,firebase_learner_enabled,firebase_diagnostic_enabled').eq('id',1).single();
    if(controlError|| (claims.diag ? !control?.firebase_diagnostic_enabled : (!control?.tutor_enabled||!control?.firebase_learner_enabled)))reject();
    const {data:reservation,error:reserveError}=await db.rpc('reserve_ai_request_v2916',{
      p_user_id:claims.uid,p_request_id:claims.rid,p_question_id:claims.qid
    });
    if(reserveError||reservation!=='reserved')reject();
    // Remove signed metadata before the Gemini provider sees the educational prompt.
    return {...request,
      contents:[{...contents[0],parts:[{text:prompt}]}],
      generationConfig:{...request.generationConfig,maxOutputTokens:Math.min(request.generationConfig?.maxOutputTokens??1024,1024)}
    };
  }catch(error){
    // No prompt, JWT, AppCheck, user ID, or secret in logs or client errors.
    if(error instanceof HttpsError)throw error;
    reject();
  }
});
