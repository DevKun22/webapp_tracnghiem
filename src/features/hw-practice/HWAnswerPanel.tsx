import {useMemo} from 'react';
import {parseHWOptions} from './parseHWOptions';
type Props={body:string;selected:string|null;onSelect:(v:string)=>void};
export function HWAnswerPanel({body,selected,onSelect}:Props){
 const parsed=useMemo(()=>parseHWOptions(body),[body]);
 if(!parsed)return <><pre className="hw-source">{body}</pre><p className="hw-alert">Chưa tách được phương án an toàn từ PDF. Mở trang gốc để đối chiếu; câu này chưa hỗ trợ chọn đáp án.</p></>;

 return <section className="hw-answer-panel"><p className="hw-question-stem">{parsed.stem}</p><div className="hw-choices">{parsed.options.map(o=><button key={o.id} type="button" className={`hw-choice ${selected===o.id?'chosen':''}`} onClick={()=>onSelect(o.id)} aria-pressed={selected===o.id}><strong>{o.id}</strong><span>{o.text}</span></button>)}</div></section>;
}
