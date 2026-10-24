import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {verifyPromptEnvelope} from '../guard-core.js';
const key='a'.repeat(48);const prompt='Hãy giải câu Python này.';
function make({expiry=Date.now()+60000,body=prompt}={}){
 const p={v:1,uid:randomUUID(),rid:randomUUID(),qid:'slide-11-q009',mode:'short',guest:true,exp:expiry,sha:createHash('sha256').update(prompt).digest('hex')};
 const raw=Buffer.from(JSON.stringify(p)).toString('base64url');
 return `DKG1.${raw}.${createHmac('sha256',key).update(raw).digest('base64url')}\n${body}`;
}
test('accepts authenticated grant',()=>assert.equal(verifyPromptEnvelope(make(),key).prompt,prompt));
test('rejects tampered prompt',()=>assert.throws(()=>verifyPromptEnvelope(make({body:'Sai nội dung'}),key)));
test('rejects expired grant',()=>assert.throws(()=>verifyPromptEnvelope(make({expiry:Date.now()-1}),key)));
test('rejects unsigned client call',()=>assert.throws(()=>verifyPromptEnvelope('hello',key)));
test('rejects wrong HMAC key',()=>assert.throws(()=>verifyPromptEnvelope(make(),'b'.repeat(48))));
