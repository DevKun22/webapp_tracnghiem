import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.cwd();
const hw=readFileSync(resolve(root,'src/features/hw-practice/HWPractice.tsx'),'utf8');
const answers=readFileSync(resolve(root,'src/features/hw-practice/HWAnswerPanel.tsx'),'utf8');
const community=readFileSync(resolve(root,'src/features/hw-practice/CommunityAnswer.tsx'),'utf8');
const css=readFileSync(resolve(root,'src/styles/index.css'),'utf8');
const checks=[
['Intro banner no longer precedes study workspace',!hw.includes('Bài tập giảng viên')&&!hw.includes('Không gian ôn tập')],
['Compact HW context and visible progress',hw.includes('hw-compact-header')&&hw.includes('hw-document-strip')&&hw.includes('stats.answered')],
['Question index sticky and retained',hw.includes('hw-sticky-question-heading')&&css.includes('position:sticky;top:56px')],
['Manual panels restored after focus',hw.includes('showDocs&&!focusMode')&&hw.includes('showNavigator&&!focusMode')],
['AI / report actions above answers',hw.indexOf('mode="tools"')<hw.indexOf('<HWAnswerPanel')],
['Contribution immediately follows answer panel',hw.indexOf('mode="contribution"')>hw.indexOf('<HWAnswerPanel')&&hw.indexOf('mode="contribution"')<hw.indexOf('hw-notes')],
['Old unverified answer banner removed',!answers.includes('Đã lưu lựa chọn {selected}.')],
['Selected answer and contribution must be separate',community.includes('onClick={()=>void submit()}')&&community.includes('selected?<>Đã chọn')],
['Keyboard and sticky navigation',hw.includes("event.key==='ArrowLeft'")&&css.includes('.hw-modern .hw-nav{')],
['Responsive and reduced motion',css.includes('@media(max-width:760px)')&&css.includes('prefers-reduced-motion:reduce')],
];let failed=0;for(const [name,ok] of checks){console.log((ok?'PASS':'FAIL')+' '+name);if(!ok)failed++}if(failed)process.exitCode=1;
