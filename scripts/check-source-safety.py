"""Conservative static release checks. Not a security audit."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
issues=[]
if not (ROOT/'.gitignore').exists():issues.append('Missing .gitignore')
else:
    ig=(ROOT/'.gitignore').read_text()
    for pattern in ['node_modules/', 'dist/', '.env', 'docs/', 'README_V*.md', 'HW_AUDIT_STATUS.md']:
        if pattern not in ig:issues.append(f'Missing ignore pattern {pattern}')
for f in (ROOT/'src').rglob('*'):
    if f.suffix not in {'.tsx','.ts','.js','.jsx'}:continue
    value=f.read_text(encoding='utf8')
    if re.search(r'\b(supabase_service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9]{8,})\b',value,re.I):
        issues.append(f'Secret/service role reference inside browser source: {f.relative_to(ROOT)}')
if issues:
    print('FAILED:')
    for issue in issues:print('-',issue)
    raise SystemExit(1)
print('PASS: static deploy hygiene checks (not proof of security)')
