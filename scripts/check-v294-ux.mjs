import fs from 'node:fs';
const read = p => fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const practice=read('src/features/hw-practice/HWPractice.tsx');
const answers=read('src/features/hw-practice/HWAnswerPanel.tsx');
const community=read('src/features/hw-practice/CommunityAnswer.tsx');
const css=read('src/styles/index.css');
const app=read('src/App.tsx');
const checks=[
 ['Selection feedback sits with contribution, not an extra banner',!answers.includes('hw-choice-feedback') && community.includes('hw-answer-trust')],
 ['Verified answer only when content is verified',community.includes("reviewStatus==='verified'&&verifiedAnswer")],
 ['Inline contribution immediately after choices',practice.indexOf('<HWAnswerPanel ')<practice.indexOf('mode="contribution"') && practice.indexOf('mode="contribution"')<practice.indexOf('className="hw-notes"')],
 ['Both entry points use the same submit handler',practice.includes('submitButtonRef.current?.click()') && community.includes('ref={submitRef}')],
 ['Compacted floating question toolbar based on scrolling',practice.includes('new IntersectionObserver(') && practice.includes('observer.disconnect()') && css.includes('.hw-tools-compact')],
 ['No outdated technical login copy',!app.includes('Đăng nhập ẩn danh cần được bật trong Supabase Auth.')],
 ['Keyboard navigation, focus and panel state still present',practice.includes("event.key==='ArrowLeft'") && practice.includes('setFocusMode') && practice.includes('setShowNavigator')],
 ['Notes collapsed by default',practice.includes('<details className="hw-notes"')],
 ['Mobile layouts and reduced motion',css.includes('@media(max-width:760px)') && css.includes('prefers-reduced-motion')],
 ['Mobile PDF direct link and fallback',read('src/features/learning/LearningCenter.tsx').includes('mobile-pdf-fallback') && read('src/features/learning/LearningCenter.tsx').includes('Mở tài liệu PDF')],
 ['Mobile HW direct navigation',app.includes('mobile-hw-shortcut') && css.includes('.mobile-hw-shortcut')],
 ['No layout resizing on compact action bar',css.includes('Fixed-size surfaces avoid scroll feedback loops') && css.includes('max-height:49px')],
 ['No embedded secret role key in touched UI code',![practice,answers,community,app].some(x=>/service_role|supabase_secret_key/i.test(x))]
];
let failed=0;for(const [label,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(!ok)failed++}process.exitCode=failed?1:0;
