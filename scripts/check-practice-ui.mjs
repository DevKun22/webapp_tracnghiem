// Regression guard for the approved V2.9.2 question toolbar layout.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const practice=readFileSync(resolve(root,'src/features/hw-practice/HWPractice.tsx'),'utf8');
const community=readFileSync(resolve(root,'src/features/hw-practice/CommunityAnswer.tsx'),'utf8');
const assertions=[
 ['AI/report toolbar appears before the answer content', practice.indexOf('mode="tools"')>0 && practice.indexOf('mode="tools"')<practice.indexOf('<HWAnswerPanel')],
 ['Contribution stays after the answer content',practice.indexOf('mode="contribution"')>practice.indexOf('<HWAnswerPanel')],
 ['Old combined trigger removed',!community.includes('Hỏi AI · Báo lỗi đề · Thống kê')],
 ['Independent AI, report, statistics actions',community.includes('Hỏi AI <ChevronDown') && community.includes('Báo lỗi đề</button>') && community.includes('Thống kê</button>')],
 ['Explicit contribution action preserved',community.includes('onClick={()=>void submit()}')],
 ['Review and flag controls preserved',practice.includes('Đánh dấu đã ôn') && practice.includes('Gắn cờ')],
 ['Focus mode still restores manual panel preferences',practice.includes('showDocs&&!focusMode') && practice.includes('showNavigator&&!focusMode')],
];
for(const [description,pass] of assertions){console.log(`${pass?'PASS':'FAIL'}: ${description}`)}
if(assertions.some(([,pass])=>!pass))process.exitCode=1;
