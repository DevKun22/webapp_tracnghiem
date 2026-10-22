import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=(p)=>fs.readFileSync(p,'utf8');
const hw=read('src/features/hw-practice/HWPractice.tsx');
const map=read('src/features/hw-practice/components/QuestionMapSheet.tsx');
const css=read('src/styles/index.css');
const data=JSON.parse(read('src/data/hw-reference/hw-answer-notes.json'));
const approved=JSON.parse(read('src/data/hw-reference/approved-links.json'));
const catalog=JSON.parse(read('src/data/hwCatalog.json'));
assert(hw.includes('hw-smart-nav') && hw.includes('hw-quick-map-tab'));
assert(hw.includes('onSubmissionState') && hw.includes('contributionAnchor'));
assert(map.includes('aria-modal="true"') && map.includes("e.key==='Escape'"));
assert(map.includes('overscroll')===false); // CSS handles scrolling
assert(css.includes('env(safe-area-inset-bottom') && css.includes('.hw-map-dialog'));
assert.equal(data.notes.length,337);
assert.equal(catalog.questions.length,517);
assert.equal(approved.links.length,0);
console.log('PASS: V2.9.7 mobile navigation, map controls, independent answer sources (337/517, 0 approved)');
