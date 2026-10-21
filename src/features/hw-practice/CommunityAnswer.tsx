import {useEffect,useMemo,useState} from 'react';
import {Check,ChevronDown,ChevronUp,Copy,Flag,Send,Sparkles,Users,Zap,BookOpen} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {makeAiPrompt,type AiPromptMode,type Choice} from './aiPrompt';

type Summary={option_id:string;votes:number;total:number;percentage:number;status:string};
type Props={questionId:string;body:string;options:Choice[];selected:string|null;flags?:string[]};
type ReportType='ambiguous'|'multiple_answers'|'missing_information';
function contentHash(body:string,options:Choice[]):string{
  // Hash để phân biệt phiên bản nội dung, không dùng làm mã bảo mật.
  const text=body+'\n'+options.map(o=>o.id+':'+o.text).join('\n');let h=2166136261;
  for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);
  return(h>>>0).toString(16).padStart(8,'0');
}
export function CommunityAnswer({questionId,body,options,selected,flags=[]}:Props){
  const [expanded,setExpanded]=useState(false);
  const [copied,setCopied]=useState<AiPromptMode|null>(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [statusKind,setStatusKind]=useState<'success'|'error'|'info'>('info');
  const [rows,setRows]=useState<Summary[]>([]);
  const [showReport,setShowReport]=useState(false);
  const [report,setReport]=useState<ReportType>('ambiguous');
  const hash=useMemo(()=>contentHash(body,options),[body,options]);
  useEffect(()=>{setExpanded(false);setCopied(null);setStatus('');setRows([]);setShowReport(false);},[questionId]);
  async function refresh(){
    const client=supabase;if(!client)return;
    const {data,error}=await client.rpc('get_hw_answer_consensus',{p_question_id:questionId});
    if(!error&&Array.isArray(data))setRows(data as Summary[]);
  }
  useEffect(()=>{void refresh();},[questionId]);
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
    setBusy(true);setStatusKind('info');setStatus('Đang ghi nhận phiếu đóng góp...');
    try{
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user)throw new Error('Bạn cần đăng nhập để gửi đóng góp.');
      const {error}=await client.from('hw_answer_submissions').upsert({user_id:user.id,question_id:questionId,option_id:selected,question_hash:hash,source:'learner_selected',updated_at:new Date().toISOString()},{onConflict:'user_id,question_id'});
      if(error)throw error;
      setStatusKind('success');setStatus(`Đã gửi phiếu ${selected} lên Supabase. Nếu chọn và gửi lại, phiếu cũ sẽ được thay thế.`);
      await refresh();
    }catch(error){setStatusKind('error');setStatus('Không gửi được: '+(error instanceof Error?error.message:'Lỗi kết nối'));}
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
      setStatusKind('success');setStatus('Đã ghi nhận báo cáo vấn đề. Báo cáo này không tính vào phiếu đáp án.');setShowReport(false);
    }catch(error){setStatusKind('error');setStatus('Không gửi được báo cáo: '+(error instanceof Error?error.message:'Lỗi kết nối'));}
    finally{setBusy(false);}
  };
  return <section className="hw-community">
    <button className="hw-community-trigger" type="button" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>
      <Sparkles size={17}/><span>Hỏi AI <b>·</b> Đóng góp</span>{expanded?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
    </button>
    {expanded&&<div className="hw-community-content">
      <div className="hw-community-section-label">1 · HỎI AI BÊN NGOÀI</div>
      <div className="hw-community-copy-grid">
        <button className={`hw-ai-copy quick ${copied==='quick'?'copied':''}`} onClick={()=>void copy('quick')} type="button">
          {copied==='quick'?<Check size={17}/>:<Zap size={17}/>}<span>{copied==='quick'?'Đã sao chép':'Đáp án nhanh'}</span>
        </button>
        <button className={`hw-ai-copy detailed ${copied==='detailed'?'copied':''}`} onClick={()=>void copy('detailed')} type="button">
          {copied==='detailed'?<Check size={17}/>:<BookOpen size={17}/>}<span>{copied==='detailed'?'Đã sao chép':'Giải chi tiết'}</span>
        </button>
      </div>
      <div className="hw-community-hint"><Copy size={13}/> Prompt đã gồm nguyên câu hỏi và các phương án; không cần dán kết quả AI vào đây.</div>
      <div className="hw-community-section-label">2 · ĐÓNG GÓP ĐÁP ÁN</div>
      <div className="hw-community-choice-row">
        <span>{selected?<>Bạn đang chọn <strong className="hw-selected-letter">{selected}</strong></>: 'Chọn đáp án A/B/C/D ngay trên câu hỏi.'}</span>
        <button type="button" className="hw-community-send" disabled={!selected||!options.some(o=>o.id===selected)||busy} onClick={()=>void submit()}><Send size={15}/>{busy?'Đang gửi':'Gửi đóng góp'}</button>
      </div>
      <button type="button" className="hw-report-toggle" onClick={()=>setShowReport(v=>!v)}><Flag size={15}/> {showReport?'Đóng báo cáo':'Đề mơ hồ / thiếu dữ kiện? Báo lỗi'} <ChevronDown size={14}/></button>
      {showReport&&<div className="hw-report-panel"><label htmlFor={`hw-report-${questionId}`}>Chọn loại vấn đề (không bắt buộc mô tả)</label><select id={`hw-report-${questionId}`} value={report} onChange={e=>setReport(e.target.value as ReportType)}><option value="ambiguous">Đề có nhiều cách hiểu</option><option value="multiple_answers">Có nhiều đáp án đúng</option><option value="missing_information">Thiếu code / dữ kiện / phương án</option></select><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>void submitReport()}>Gửi báo cáo</button></div>}
      {status&&<p className={`hw-community-status ${statusKind}`} role="status">{statusKind==='success'&&<Check size={15}/>} {status}</p>}
      {rows.length>0&&<details className="hw-community-stats"><summary><Users size={14}/> Tham khảo đồng thuận cộng đồng</summary><div className="hw-community-votes">{rows.map(r=><div key={r.option_id}><span>{r.option_id}</span><div className="hw-vote-track"><div style={{width:`${Math.max(0,Math.min(100,Number(r.percentage)||0))}%`}}/></div><small>{r.votes} · {r.percentage}%</small></div>)}</div><small>Phiếu cộng đồng không phải đáp án được kiểm chứng.</small></details>}
      {flags.length>0&&<p className="hw-alert">Câu có cảnh báo dữ liệu gốc. Không tự dùng đồng thuận để xác nhận chuyên môn.</p>}
    </div>}
  </section>;
}
