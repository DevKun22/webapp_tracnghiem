import {useEffect,useMemo,useState,type Ref} from 'react';
import {Check,ChevronDown,Flag,Send,Sparkles,Users,Zap,BookOpen} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {makeAiPrompt,type AiPromptMode,type Choice} from './aiPrompt';

type Summary={option_id:string;votes:number;total:number;percentage:number;status:string};
type Props={questionId:string;body:string;options:Choice[];selected:string|null;flags?:string[];mode?:'tools'|'contribution';reviewStatus?:string;verifiedAnswer?:string|null;explanation?:string;submitRef?:Ref<HTMLButtonElement>;onSubmissionState?:(state:'sending'|'sent'|'error')=>void};
type ReportType='ambiguous'|'multiple_answers'|'missing_information';
function contentHash(body:string,options:Choice[]):string{
  // Hash để phân biệt phiên bản nội dung, không dùng làm mã bảo mật.
  const text=body+'\n'+options.map(o=>o.id+':'+o.text).join('\n');let h=2166136261;
  for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return(h>>>0).toString(16).padStart(8,'0');
}
export function CommunityAnswer({questionId,body,options,selected,flags=[],mode='contribution',reviewStatus,verifiedAnswer,explanation,submitRef,onSubmissionState}:Props){
  const [activeTool,setActiveTool]=useState<'ai'|'report'|'stats'|null>(null);
  const [copied,setCopied]=useState<AiPromptMode|null>(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [statusKind,setStatusKind]=useState<'success'|'error'|'info'>('info');
  const [rows,setRows]=useState<Summary[]>([]);
  const [lastSent,setLastSent]=useState<string|null>(null);
  const [report,setReport]=useState<ReportType>('ambiguous');
  const hash=useMemo(()=>contentHash(body,options),[body,options]);
  useEffect(()=>{setActiveTool(null);setCopied(null);setStatus('');setRows([]);setLastSent(null);},[questionId]);
  async function refresh(){
    const client=supabase;if(!client)return;
    const {data,error}=await client.rpc('get_hw_answer_consensus',{p_question_id:questionId});
    if(!error&&Array.isArray(data))setRows(data as Summary[]);
  }
  useEffect(()=>{if(mode==='tools')void refresh();},[questionId,mode]);
  const copy=async(mode:AiPromptMode)=>{
    try{
      await navigator.clipboard.writeText(makeAiPrompt({questionId,body,options},mode));
      setCopied(mode);setStatusKind('success');setStatus('Đã sao chép. Dán vào AI để hỏi, rồi quay lại chọn đáp án ngay trên câu hỏi.');
    }catch{setStatusKind('error');setStatus('Không sao chép được. Hãy kiểm tra quyền clipboard hoặc sử dụng HTTPS.');}
  };
  const submit=async()=>{
    const client=supabase;
    if(!client){setStatusKind('error');setStatus('Supabase chưa được cấu hình.');return;}
    if(!selected||!options.some(o=>o.id===selected)){setStatusKind('error');setStatus('Chọn A/B/C/D ở phía trên câu hỏi trước khi gửi.');return;}
    setBusy(true);onSubmissionState?.('sending');setStatusKind('info');setStatus('Đang ghi nhận phiếu đóng góp...');
    try{
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user)throw new Error('Bạn cần đăng nhập để gửi đóng góp.');
      const {error}=await client.from('hw_answer_submissions').upsert({user_id:user.id,question_id:questionId,option_id:selected,question_hash:hash,source:'learner_selected',updated_at:new Date().toISOString()},{onConflict:'user_id,question_id'});
      if(error)throw error;
      setLastSent(selected);onSubmissionState?.('sent');setStatusKind('success');setStatus(`Đã gửi phiếu ${selected}. Bạn có thể đổi lựa chọn và gửi lại.`);
      await refresh();
    }catch(error){console.error('Không gửi được đóng góp HW',error);onSubmissionState?.('error');setStatusKind('error');setStatus('Không gửi được đóng góp. Vui lòng kiểm tra kết nối và thử lại.');}
    finally{setBusy(false);}
  };
  const submitReport=async()=>{
    const client=supabase;if(!client){setStatusKind('error');setStatus('Chưa cấu hình Supabase.');return;}
    setBusy(true);setStatusKind('info');setStatus('Đang gửi báo cáo...');
    try{
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user)throw new Error('Bạn cần đăng nhập.');
      const {error}=await client.from('hw_question_reports').upsert({user_id:user.id,question_id:questionId,question_hash:hash,report_type:report,updated_at:new Date().toISOString()},{onConflict:'user_id,question_id'});
      if(error)throw error;
      setStatusKind('success');setStatus('Đã ghi nhận báo cáo vấn đề. Báo cáo này không tính vào phiếu đáp án.');setActiveTool(null);
    }catch(error){console.error('Không gửi được báo cáo HW',error);setStatusKind('error');setStatus('Không gửi được báo cáo. Vui lòng thử lại sau.');}
    finally{setBusy(false);}
  };
  if(mode==='contribution')return <section className="hw-community hw-community-contribution" aria-label="Phản hồi và đóng góp đáp án">
    <div className="hw-community-quick">
      <div className="hw-community-quick-selection" aria-live="polite">
        <span>{selected?<>Đã chọn <strong>{selected}</strong></>:'Chưa chọn đáp án'}</span>
        {reviewStatus==='verified'&&verifiedAnswer?<span className="hw-answer-trust verified">{selected===verifiedAnswer?'Chính xác':`Đáp án xác minh: ${verifiedAnswer}`}</span>:reviewStatus==='ambiguous'?<span className="hw-answer-trust ambiguous">Đề cần xem lại</span>:<span className="hw-answer-trust">Chưa có đáp án xác minh</span>}
        {lastSent===selected&&selected&&<span className="hw-answer-trust sent"><Check size={13}/> Đã gửi đóng góp</span>}
      </div>
      <button ref={submitRef} type="button" className="hw-community-send" disabled={!selected||!options.some(o=>o.id===selected)||busy} onClick={()=>void submit()}><Send size={15}/>{busy?'Đang gửi':lastSent===selected?'Gửi lại đóng góp':'Đóng góp đáp án'}</button>
    </div>
    {(reviewStatus==='verified'||reviewStatus==='ambiguous')&&explanation&&<details className="hw-inline-explanation"><summary>Xem giải thích</summary><p>{explanation}</p></details>}
    {status&&<p className={`hw-community-status ${statusKind}`} role="status">{statusKind==='success'&&<Check size={15}/>} {status}</p>}
  </section>;
  return <section className="hw-community hw-community-tools" aria-label="Hỏi AI và báo lỗi câu hỏi">
    <div className="hw-tool-buttons">
      <button type="button" className="hw-tool-ai" aria-expanded={activeTool==='ai'} onClick={()=>setActiveTool(v=>v==='ai'?null:'ai')}><Sparkles size={16}/> Hỏi AI <ChevronDown size={14}/></button>
      <button type="button" className="hw-tool-report" aria-expanded={activeTool==='report'} onClick={()=>setActiveTool(v=>v==='report'?null:'report')}><Flag size={16}/> Báo lỗi đề</button>
      <button type="button" className="hw-tool-stats" aria-expanded={activeTool==='stats'} onClick={()=>setActiveTool(v=>v==='stats'?null:'stats')}><Users size={16}/> Thống kê</button>
    </div>
    {activeTool&&<div className="hw-tool-flyout" role="region" aria-label={activeTool==='ai'?'Sao chép prompt hỏi AI':activeTool==='report'?'Báo cáo đề có vấn đề':'Thống kê cộng đồng'}>
      <button type="button" className="hw-tool-dismiss" onClick={()=>setActiveTool(null)} aria-label="Đóng bảng công cụ">×</button>
      {activeTool==='ai'&&<><strong>Hỏi AI bên ngoài</strong><div className="hw-community-copy-grid">
        <button className={`hw-ai-copy quick ${copied==='quick'?'copied':''}`} onClick={()=>void copy('quick')} type="button">{copied==='quick'?<Check size={17}/>:<Zap size={17}/>} {copied==='quick'?'Đã sao chép':'Đáp án nhanh'}</button>
        <button className={`hw-ai-copy detailed ${copied==='detailed'?'copied':''}`} onClick={()=>void copy('detailed')} type="button">{copied==='detailed'?<Check size={17}/>:<BookOpen size={17}/>} {copied==='detailed'?'Đã sao chép':'Giải chi tiết'}</button>
      </div><small>Prompt bao gồm nguyên câu hỏi và các lựa chọn.</small></>}
      {activeTool==='report'&&<><strong>Báo câu hỏi có vấn đề</strong><div className="hw-report-panel"><label htmlFor={`hw-report-${questionId}`}>Chọn loại vấn đề</label><select id={`hw-report-${questionId}`} value={report} onChange={e=>setReport(e.target.value as ReportType)}><option value="ambiguous">Đề có nhiều cách hiểu</option><option value="multiple_answers">Có nhiều đáp án đúng</option><option value="missing_information">Thiếu code / dữ kiện / phương án</option></select><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>void submitReport()}>Gửi báo cáo</button></div></>}
      {activeTool==='stats'&&<><strong>Đồng thuận cộng đồng</strong>{rows.length?<div className="hw-community-votes">{rows.map(r=><div key={r.option_id}><span>{r.option_id}</span><div className="hw-vote-track"><div style={{width:`${Math.max(0,Math.min(100,Number(r.percentage)||0))}%`}}/></div><small>{r.votes} · {r.percentage}%</small></div>)}</div>:<small>Chưa có thống kê để hiển thị.</small>}<small>Phiếu cộng đồng không phải đáp án đã kiểm chứng.</small></>}
      {flags.length>0&&<p className="hw-alert">Câu có cảnh báo dữ liệu gốc; cần đối chiếu PDF.</p>}
    </div>}
    {status&&<p className={`hw-community-status ${statusKind}`} role="status">{statusKind==='success'&&<Check size={15}/>} {status}</p>}
  </section>;
}
