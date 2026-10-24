import {useEffect,useMemo,useState} from 'react';
import {Sparkles} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {parseHWOptions} from './parseHWOptions';
type Stat={option_id:string;votes:number;total:number;percentage:number};
type Props={body:string;questionId:string;selected:string|null;revision?:number;onSelect:(v:string)=>void;onAskAi?:()=>void;verified?:boolean};
export function HWAnswerPanel({body,questionId,selected,revision=0,onSelect,onAskAi,verified=false}:Props){
 const parsed=useMemo(()=>parseHWOptions(body),[body]);
 const [stats,setStats]=useState<Stat[]>([]);
 const [state,setState]=useState<'idle'|'loading'|'ready'|'error'>('idle');
 useEffect(()=>{
   if(!selected){setStats([]);setState('idle');return;}
   const client=supabase;if(!client){setState('error');return;}
   let active=true;setState('loading');setStats([]);
   const loadStats = async () => {
     try {
       const { data, error } = await client.rpc('get_hw_answer_consensus', { p_question_id: questionId });
       if (!active) return;
       if (error || !Array.isArray(data)) { setState('error'); return; }
       setStats(data as Stat[]);
       setState('ready');
     } catch {
       if (active) setState('error');
     }
   };
   void loadStats();
   return()=>{active=false};
 },[questionId,selected,revision]);
 if(!parsed)return <><pre className="hw-source">{body}</pre><p className="hw-alert">Chưa tách được phương án an toàn từ PDF. Mở trang gốc để đối chiếu; câu này chưa hỗ trợ chọn đáp án.</p></>;
 const total=stats[0]?.total||0;const meaningful=total>=5;
 return <section className="hw-answer-panel"><p className="hw-question-stem">{parsed.stem}</p><div className="hw-choices">{parsed.options.map(o=>{
  const row=stats.find(s=>s.option_id===o.id);
  return <div className={`dk-choice-group ${selected===o.id?'is-selected':''}`} key={o.id}>
   <button type="button" className={`hw-choice ${selected===o.id?'chosen':''}`} onClick={()=>onSelect(o.id)} aria-pressed={selected===o.id}><strong>{o.id}</strong><span>{o.text}</span></button>
   {selected===o.id&&!verified&&onAskAi&&<div className="dk-context-ai-action"><span>Đã chọn {o.id} · Chưa có đáp án xác minh</span><button type="button" className="dk-context-ai-button" onClick={onAskAi} aria-label={`Hỏi AI về câu ${questionId}, đã chọn ${o.id}`}><Sparkles size={15}/> Hỏi AI</button></div>}
   {selected&&state==='ready'&&<div className="dk-inline-votes" aria-label={`${o.id}: ${row?.votes||0} lượt đóng góp`}>
    {meaningful&&<div className="dk-inline-vote-track"><div style={{width:`${Math.max(0,Math.min(100,Number(row?.percentage)||0))}%`}}/></div>}
    <small>{row?.votes||0} lượt {meaningful?`· ${Number(row?.percentage)||0}%`:''}</small>
   </div>}
  </div>
 })}</div>
 {selected&&<p className="dk-vote-note" role="status">{state==='loading'?'Đang tải thống kê cộng đồng…':state==='error'?'Chưa thể tải thống kê. Bạn vẫn có thể tiếp tục học.':!total?'Chưa có đóng góp cộng đồng.':meaningful?`${total} lượt đóng góp; tỷ lệ không xác nhận đáp án đúng.`:`Mới có ${total} lượt đóng góp. Cần ít nhất 5 người tham gia để hiện tỷ lệ.`}</p>}
 </section>;
}
