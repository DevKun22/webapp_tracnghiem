import {normalizeTutorAnswer} from '../aiAnswerFormat';
/** Accessible, text-only answer renderer: provider text is never injected as HTML. */
export function AIExplanation({answer,verifiedAnswer}:{answer:string;verifiedAnswer?:string|null}){
 const data=normalizeTutorAnswer(answer);
 const paragraphs=data.explanation.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 const optionRows=Object.entries(data.optionAnalysis);
 return <section className="dk-ai-answer" aria-label="Lời giải từ AI">
  <div className="dk-ai-answer-heading"><strong>Trợ giảng giải thích</strong><span>AI tạo · Cần kiểm chứng</span></div>
  {verifiedAnswer&&<p className="dk-ai-official"><strong>Đáp án đã xác minh: {verifiedAnswer}.</strong> Phần AI chỉ giải thích, không thay đổi đáp án chính thức.</p>}
  {data.suggestedAnswer&&<p className="dk-ai-answer-suggestion"><strong>AI gợi ý: {data.suggestedAnswer}</strong>{verifiedAnswer&&data.suggestedAnswer!==verifiedAnswer?' · Khác đáp án đã xác minh, nên kiểm tra lại.':''}</p>}
  {data.summary&&<p className="dk-ai-answer-summary">{data.summary}</p>}
  <div className="dk-ai-answer-body">{paragraphs.map((paragraph,i)=><div key={i} className="dk-ai-answer-paragraph">{paragraph.split('\n').filter(Boolean).map((line,j)=>{
    const match=line.trim().match(/^(?:[-•]\s*|\d+[.)]\s*)(.*)$/);
    return <p key={j} className={match?'dk-ai-answer-point':''}>{match?match[1]:line}</p>;
  })}</div>)}</div>
  {optionRows.length>0&&<div className="dk-ai-options"><strong>Phân tích các phương án</strong>{optionRows.map(([letter,description])=><p key={letter}><b>{letter}.</b> {description}</p>)}</div>}
  {data.caveat&&<p className="dk-ai-answer-caveat">Lưu ý: {data.caveat}</p>}
  <p className="dk-ai-answer-note">Lời giải AI không tự thay đổi đáp án chính thức hoặc kết quả học tập.</p>
 </section>;
}
