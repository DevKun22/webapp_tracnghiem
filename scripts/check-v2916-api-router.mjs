import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
const names=['ai-check','ai-config','ai-control','ai-providers','ai-quotas','ai-status','ai-users'];
const apiFiles=(folder)=>readdirSync(folder,{withFileTypes:true}).flatMap(item=>item.isDirectory()?apiFiles(path.join(folder,item.name)):item.name.endsWith('.ts')||item.name.endsWith('.js')?[path.join(folder,item.name)]:[]);
const entries=apiFiles('api');
assert.equal(entries.length,8,`Expected 8 API entrypoints, got ${entries.length}: ${entries}`);
assert.ok(entries.includes(path.join('api','admin','[action].ts')));
const router=readFileSync('api/admin/[action].ts','utf8');
for(const name of names){
 assert.ok(router.includes(`'${name}':`),`missing route ${name}`);
 assert.ok(!existsSync(`api/admin/${name}.ts`),`old endpoint still deployed ${name}`);
 const source=readFileSync(`server/admin-handlers/${name}.ts`,'utf8');
 assert.match(source,/authorize\(req\s*,\s*res\)/,`RBAC/MFA missing: ${name}`);
 if(name!=='ai-status') assert.match(source,/checkPostOrigin\(req\s*,\s*res\)/,`origin protection missing: ${name}`);
}
assert.match(router,/const handlers:/);
assert.match(router,/selected\(req, res\)/);
assert.match(router,/NOT_FOUND/);
assert.match(router,/\/api/);
console.log('PASS V2.9.16 Hobby API consolidation: 14 -> 8 entrypoints, routes/guards retained (static only)');
