import {Flag,Check} from 'lucide-react';

type Item={id:string};
type Props={questions:Item[];current:number;answers:Record<string,string>;reviewed:string[];flags:string[];onNavigate:(index:number)=>void};
export function HWQuestionNavigator({questions,current,answers,reviewed,flags,onNavigate}:Props){
 return <section className="panel hw-navigator" aria-label="Điều hướng câu hỏi"><div className="hw-navigator-title"><strong>Bản đồ câu hỏi</strong><small>{Object.keys(answers).filter(id=>questions.some(q=>q.id===id)).length}/{questions.length} đã chọn • {flags.length} cờ</small></div><div className="hw-number-grid">{questions.map((q,i)=><button type="button" title={`Câu ${i+1}${flags.includes(q.id)?' • Có cờ':''}`} aria-label={`Đến câu ${i+1}`} aria-current={current===i?'step':undefined} key={q.id} className={`hw-number ${current===i?'current':''} ${answers[q.id]?'answered':''} ${reviewed.includes(q.id)?'reviewed':''}`} onClick={()=>onNavigate(i)}><span>{i+1}</span>{flags.includes(q.id)?<Flag size={11} className="hw-number-flag"/>:reviewed.includes(q.id)?<Check size={11}/>:null}</button>)}</div><div className="hw-legend"><span>◻ Chưa chọn</span><span>● Đã chọn</span><span>⚑ Gắn cờ</span><span>✓ Đã ôn</span></div></section>;
}
