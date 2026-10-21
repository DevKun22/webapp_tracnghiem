import {useMemo} from 'react';
import {parseHWOptions} from './parseHWOptions';
type Props={body:string;selected:string|null;onSelect:(v:string)=>void;answer?:string|null;status:string;explanation?:string};
export function HWAnswerPanel({body,selected,onSelect,answer,status,explanation}:Props){
 const parsed=useMemo(()=>parseHWOptions(body),[body]);
 if(!parsed)return <><pre className="hw-source">{body}</pre><p className="hw-alert">Chưa tách được phương án an toàn từ PDF. Mở trang gốc để đối chiếu; câu này chưa hỗ trợ chọn đáp án.</p></>;
 const checked=status==='verified'&&Boolean(answer);
 return <section className="hw-answer-panel"><p className="hw-question-stem">{parsed.stem}</p><div className="hw-choices">{parsed.options.map(o=><button key={o.id} type="button" className={`hw-choice ${selected===o.id?'chosen':''}`} onClick={()=>onSelect(o.id)} aria-pressed={selected===o.id}><strong>{o.id}</strong><span>{o.text}</span></button>)}</div>{selected&&<div className="hw-choice-feedback">{status==='ambiguous'?<><b>Câu gốc có nhiều phương án hợp lệ</b><p>{explanation||'Cần đối chiếu đề gốc.'}</p></>:checked?<><b>{selected===answer?'✓ Chính xác':'Đã chọn '+selected+' • Đáp án: '+answer}</b>{explanation&&<p>{explanation}</p>}</>:<p>Đã lưu lựa chọn {selected}. Câu này chưa có đáp án được kiểm chứng nên hệ thống không chấm đúng/sai.</p>}</div>}</section>;
}
