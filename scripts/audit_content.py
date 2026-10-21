#!/usr/bin/env python3
"""Báo cáo nội dung HW; không coi câu thiếu đáp án là đã kiểm định."""
import json,collections,pathlib,re
base=pathlib.Path(__file__).resolve().parents[1]
data=json.loads((base/'src/data/hwCatalog.json').read_text(encoding='utf-8'))
qs=data['questions']; bydoc=collections.Counter(q['documentId'] for q in qs)
verified=[q for q in qs if q.get('reviewStatus')=='verified' and q.get('answer') in ['A','B','C','D'] and q.get('explanation')]
print(f"Tổng mục: {len(qs)}; HW: {len(data['documents'])}; Đã có lời giải + đáp án: {len(verified)}; Chưa đủ: {len(qs)-len(verified)}")
for doc in data['documents']:print(f"{doc['title']}: {bydoc[doc['id']]} mục")
assert len({q['id'] for q in qs}) == len(qs), 'Trùng ID câu hỏi'
assert all(q.get('bodyOriginal') for q in qs), 'Thiếu văn bản gốc để đối chiếu'
assert all(q.get('sourcePage',q.get('page',0))>=1 for q in qs), 'Thiếu trang PDF'
print('PASS: ID duy nhất, giữ bodyOriginal và trang nguồn.')
