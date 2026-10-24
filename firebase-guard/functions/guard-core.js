import { createHash,createHmac,timingSafeEqual } from 'node:crypto';

/** Pure verifier: no Supabase calls or provider side effects. */
export function verifyPromptEnvelope(text,secret,now=Date.now()){
  if(typeof text!=='string'||text.length>16000||typeof secret!=='string'||Buffer.byteLength(secret)<32)throw Error('DENIED');
  const i=text.indexOf('\n');
  if(i<0||i>1600)throw Error('DENIED');
  const [tag,body]=[text.slice(0,i),text.slice(i+1)];
  const match=/^DKG1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]{43})$/.exec(tag);
  if(!match||!body||body.length>12000)throw Error('DENIED');
  const expected=createHmac('sha256',secret).update(match[1]).digest();
  const actual=Buffer.from(match[2],'base64url');
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw Error('DENIED');
  let p;try{p=JSON.parse(Buffer.from(match[1],'base64url').toString('utf8'));}catch{throw Error('DENIED');}
  if(p.v!==1||!Number.isInteger(p.exp)||p.exp<now||p.exp>now+65000||
     !/^[0-9a-f-]{36}$/i.test(p.uid)|| !/^[0-9a-f-]{36}$/i.test(p.rid)||
     !/^[a-zA-Z0-9-]{5,80}$/.test(p.qid)|| !['quick','short','detailed'].includes(p.mode)||
     typeof p.guest!=='boolean'||typeof p.sha!=='string'||
     p.sha!==createHash('sha256').update(body).digest('hex'))throw Error('DENIED');
  return {claims:p,prompt:body};
}
