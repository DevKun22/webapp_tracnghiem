#!/usr/bin/env python3
"""Conservative report, never mutates original catalog or answer keys."""
import csv, json, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'src/data/hwCatalog.json').read_text(encoding='utf-8'))
audit=json.loads((root/'src/data/hwAudit.json').read_text(encoding='utf-8'))
out=root/'reports';out.mkdir(exist_ok=True)
rows=[]
for q in data['questions']:
    body=q.get('body') or ''
    original=q.get('bodyOriginal') or ''
    display=audit.get(q['id'],{}).get('displayText',body)
    reasons=[]
    # Consecutive original extracted Python line numbers, likely lost line breaks.
    if re.search(r'\[\d+\][^\n]{3,}?\[\d+\]', display):reasons.append('CODE_LINE_NUMBERS_JOINED')
    if re.search(r'\b(?:print|def|for|if|while|return)\s*\(',display) and re.search(r'\)\s*(?:print\s*\(|del\s+\w+|\[\d+\])',display):reasons.append('POSSIBLE_PYTHON_LINES_JOINED')
    if '\ufffd' in display:reasons.append('REPLACEMENT_CHARACTER')
    if not display.strip():reasons.append('EMPTY_TEXT')
    if original and re.sub(r'\s+','',original)!=re.sub(r'\s+','',body):reasons.append('SOURCE_BODY_DIFF_NONSPACE')
    if q.get('reviewStatus')!='verified':reasons.append('NOT_EXPERT_VERIFIED')
    if reasons:
        rows.append({'question_id':q['id'],'document_id':q['documentId'],'page':q.get('page',''),'flags':';'.join(reasons),'preview':display[:220].replace('\n',' ⏎ ')})
with (out/'hw_format_review.csv').open('w',encoding='utf-8-sig',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=['question_id','document_id','page','flags','preview']);writer.writeheader();writer.writerows(rows)
summary={'total_questions':len(data['questions']),'flagged_for_review':len(rows),'flag_counts':{flag:sum(flag in r['flags'].split(';') for r in rows) for flag in sorted({s for r in rows for s in r['flags'].split(';')})}}
(out/'hw_format_review_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,ensure_ascii=False,indent=2))
print('Review only: report is heuristic; DO NOT automatically rewrite Python code, options, answers or versions.')
