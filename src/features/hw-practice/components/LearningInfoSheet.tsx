import {useEffect,useRef,useState} from 'react';
import {CheckCircle2,ClipboardCopy,ExternalLink,Flag,Info,Send,Sparkles,Users,X} from 'lucide-react';
import {supabase} from '../../../lib/supabase';
import {makeAiPrompt,type Choice} from '../aiPrompt';

type Summary={option_id:string;votes:number;total:number;percentage:number};
type Tab='result'|'community'|'ai';
type Props={open:boolean;onClose:()=>void;questionId:string;body:string;options:Choice[];selected:string|null;verifiedAnswer?:string|null;reviewStatus?:string;explanation?:string;onContribute:()=>void};
export function LearningInfoSheet({open,onClose,questionId,body,options,selected,verifiedAnswer,reviewStatus,explanation,onContribute}:Props){
 const [tab,setTab]=useState<Tab>('result');
 const [rows,setRows]=useState<Summary[]>([]);
 const [copyStatus,setCopyStatus]=useState('');
 const [statsLoading,setStatsLoading]=useState(false);
 const [reportType,setReportType]=useState<'ambiguous'|'multiple_answers'|'missing_information'>('ambiguous');
 const [reportState,setReportState]=useState('');
 const [reportBusy,setReportBusy]=useState(false);
 const closeRef=useRef<HTMLButtonElement>(null);
 const dialogRef=useRef<HTMLElement>(null);
 const openerRef=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(!open)return;setTab('result');setCopyStatus('');openerRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;const old=document.body.style.overflow;document.body.style.overflow='hidden';closeRef.current?.focus();const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();if(e.key==='Tab'){const nodes=dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}};document.addEventListener('keydown',onKey);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',onKey);openerRef.current?.focus()}},[open,onClose]);
 useEffect(()=>{if(!open||tab!=='community')return;let cancelled=false;setStatsLoading(true);setRows([]);const client=supabase;if(!client){setStatsLoading(false);return}void client.rpc('get_hw_answer_consensus',{p_question_id:questionId}).then(({data,error})=>{if(cancelled)return;if(!error&&Array.isArray(data))setRows(data as Summary[]);setStatsLoading(false)});return()=>{cancelled=true}},[open,tab,questionId]);
 if(!open)return null;
 const verified=reviewStatus==='verified'&&!!verifiedAnswer;
 const submitReport=async()=>{
  if(!supabase){setReportState('Chưa thể kết nối đến hệ thống.');return;}
  const text=body+'\n'+options.map(o=>o.id+':'+o.text).join('\n');let hash=2166136261;
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
  setReportBusy(true);setReportState('Đang gửi báo cáo…');
  try{
   const {data:{user},error}=await supabase.auth.getUser();
   if(error||!user)throw new Error('Chưa đăng nhập');
   const result=await supabase.from('hw_question_reports').upsert({user_id:user.id,question_id:questionId,question_hash:(hash>>>0).toString(16).padStart(8,'0'),report_type:reportType,updated_at:new Date().toISOString()},{onConflict:'user_id,question_id'});
   if(result.error)throw result.error;
   setReportState('Đã ghi nhận báo cáo. Cảm ơn bạn.');
  }catch(error){console.error('Không thể gửi báo cáo HW',error);setReportState('Không gửi được báo cáo. Vui lòng thử lại.')}finally{setReportBusy(false)}
 };
 const copyPrompt=async()=>{try{await navigator.clipboard.writeText(makeAiPrompt({questionId,body,options},'detailed'));setCopyStatus('Đã sao chép prompt. Bạn có thể dán vào ứng dụng AI bên ngoài.')}catch{setCopyStatus('Không thể sao chép. Vui lòng kiểm tra quyền sao chép của trình duyệt.')}};
 return <div className="dk-learning-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section ref={dialogRef} className="dk-learning-sheet" role="dialog" aria-modal="true" aria-label="Thông tin câu hỏi">
   <div className="dk-learning-grip" aria-hidden="true"/>
   <header className="dk-learning-header"><div><strong>Thông tin câu hỏi</strong><small>Đã chọn {selected??'—'} · {verified?'Có đáp án xác minh':'Chưa thể kết luận'}</small></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng thông tin"><X size={20}/></button></header>
   <nav className="dk-learning-tabs" aria-label="Chọn nội dung">
    {([{id:'result',label:'Kết quả'},{id:'community',label:'Cộng đồng'},{id:'ai',label:'Hỏi AI'}] as const).map(t=><button type="button" key={t.id} aria-current={tab===t.id?'page':undefined} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.label}</button>)}
   </nav>
   <div className="dk-learning-content">
    {tab==='result'&&<>
     {verified?<div className="dk-learning-result verified"><CheckCircle2 size={20}/><div><strong>{selected===verifiedAnswer?'Bạn đã chọn đúng':'Đáp án đã xác minh: '+verifiedAnswer}</strong><p>{selected===verifiedAnswer?'Đáp án của bạn trùng với nguồn đã kiểm duyệt.':'Bạn đã chọn '+selected+'. Đáp án được kiểm duyệt là '+verifiedAnswer+'.'}</p></div></div>:<div className="dk-learning-result"><Info size={20}/><div><strong>CHƯA THỂ KẾT LUẬN</strong><p>Chưa có đáp án chuẩn được xác minh cho câu này. Ý kiến cộng đồng và AI chỉ để tham khảo.</p></div></div>}
     {verified&&explanation&&<div className="dk-learning-explanation"><strong>Giải thích</strong><p>{explanation}</p></div>}
     <button className="dk-learning-action" type="button" onClick={()=>setTab('community')}><Users size={16}/> Xem ý kiến cộng đồng</button>
     <details className="dk-learning-report"><summary><Flag size={15}/> Báo câu hỏi có vấn đề</summary><label htmlFor="dk-report-type">Loại vấn đề</label><select id="dk-report-type" value={reportType} onChange={e=>setReportType(e.target.value as typeof reportType)}><option value="ambiguous">Đề có nhiều cách hiểu</option><option value="multiple_answers">Có nhiều đáp án đúng</option><option value="missing_information">Thiếu dữ kiện hoặc phương án</option></select><button type="button" disabled={reportBusy} onClick={()=>void submitReport()}>{reportBusy?'Đang gửi…':'Gửi báo cáo'}</button>{reportState&&<p role="status">{reportState}</p>}</details>
    </>}
    {tab==='community'&&<><strong>Phân bố đóng góp</strong><p className="dk-learning-muted">Các phiếu được ghi nhận chỉ mang tính tham khảo; không phải đáp án đã xác minh.</p>{statsLoading?<p role="status">Đang tải thống kê…</p>:rows.length? <div className="dk-learning-votes">{rows.map(r=><div className="dk-learning-vote" key={r.option_id}><b>{r.option_id}</b><div className="dk-learning-track"><div style={{width:`${Math.max(0,Math.min(100,Number(r.percentage)||0))}%`}}/></div><small>{r.votes} · {r.percentage}%</small></div>)}</div>:<p>Chưa có dữ liệu đóng góp để hiển thị.</p>}<button type="button" className="dk-learning-action" onClick={()=>{onClose();onContribute()}}><Send size={16}/> Gửi hoặc cập nhật đóng góp</button></>}
    {tab==='ai'&&<><div className="dk-learning-result"><Sparkles size={20}/><div><strong>Trợ giảng AI — đang chuẩn bị cho V3</strong><p>Phiên bản này chưa kết nối dịch vụ AI và chưa tính lượt sử dụng. Không có ô nhập nội dung.</p></div></div><p className="dk-learning-muted">Trong thời gian chờ AI tích hợp, bạn có thể sao chép prompt tự động được tạo từ đúng câu hỏi và các lựa chọn.</p><button type="button" className="dk-learning-action" onClick={()=>void copyPrompt()}><ClipboardCopy size={16}/> Sao chép yêu cầu giải thích</button>{copyStatus&&<p className="dk-learning-muted" role="status">{copyStatus}</p>}<a className="dk-learning-help-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Mở công cụ AI bên ngoài</a></>}
   </div>
  </section>
 </div>;
}
