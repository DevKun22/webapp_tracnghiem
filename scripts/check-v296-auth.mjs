import fs from 'node:fs';
const app=fs.readFileSync('src/App.tsx','utf8');
const account=fs.readFileSync('src/features/auth/AccountSecurity.tsx','utf8');
const landing=fs.readFileSync('src/features/auth/AuthLanding.tsx','utf8');
const errors=fs.readFileSync('src/features/auth/auth-errors.ts','utf8');
const password=fs.readFileSync('src/features/auth/PasswordField.tsx','utf8');
const checks=[
 ['Login, registration, guest and recovery modes', ['guest','login','register','recover'].every(x=>landing.includes(`'${x}'`))],
 ['Visible password toggle and accessible labels', password.includes('EyeOff')&&password.includes('aria-pressed')&&password.includes('Hiện mật khẩu')],
 ['Password setter name collision removed',account.includes('handleSetPassword')&&!account.includes('const setPassword=async')],
 ['Preserve user id on guest email linking',account.includes('updateUser({email:')&&account.includes('user.id!==currentId')],
 ['Password reset event supported',app.includes("event==='PASSWORD_RECOVERY'")],
 ['Anonymous logout warning preserved',app.includes('user?.is_anonymous')],
 ['Vietnamese Supabase error mapping', errors.includes('missing email or phone')&&errors.includes('Invalid')===false],
 ['Old login block replaced',app.includes('<AuthLanding')&&!app.includes('mode-pills"><button')],
];
for(const [name,pass] of checks){console.log((pass?'PASS ':'FAIL ')+name)}
if(checks.some(([,pass])=>!pass))process.exitCode=1;
