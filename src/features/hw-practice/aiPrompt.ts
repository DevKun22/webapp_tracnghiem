export type AiPromptMode = 'quick' | 'short' | 'detailed';
export type Choice = {id:string;text:string};
export const AI_PROMPT_MODES: {id:AiPromptMode;label:string;description:string}[] = [
 {id:'quick',label:'Đáp án nhanh',description:'Đáp án và một nhận xét rất ngắn'},
 {id:'short',label:'Giải ngắn',description:'Kết luận và các lý do chính'},
 {id:'detailed',label:'Giải chi tiết',description:'Phân tích từng bước và các phương án'},
];
/** Tạo prompt từ câu hỏi trong phiên học; không tự gửi nội dung hay tài liệu cho AI. */
export function makeAiPrompt(input:{questionId:string;body:string;options:Choice[];language?:string},mode:AiPromptMode):string {
 const choices=input.options.map(o=>`${o.id}. ${o.text}`).join('\n');
 const header=`Bạn là trợ giảng hỗ trợ giải câu trắc nghiệm ${input.language||'Python 3'}. Không phỏng đoán, không tự nhận câu trả lời là đáp án đã kiểm duyệt.\nMã câu: ${input.questionId}\n\nCÂU HỎI:\n${input.body.trim()}\n\nPHƯƠNG ÁN:\n${choices}`;
 const instructions: Record<AiPromptMode,string>={
  quick:"Nêu 'ĐÁP ÁN ĐỀ XUẤT: X' (A/B/C/D) và một câu giải thích thật ngắn. Nếu câu thiếu dữ kiện hoặc mơ hồ, nói 'CHƯA THỂ KẾT LUẬN'.",
  short:"Nêu đáp án đề xuất và giải thích ngắn gọn 3–5 câu với căn cứ chính. Nếu câu thiếu dữ kiện, sai cú pháp hoặc nhiều cách hiểu, nói 'CHƯA THỂ KẾT LUẬN'.",
  detailed:"Giải chi tiết theo từng bước, đánh giá các phương án A/B/C/D, phân tích cú pháp/đầu ra nếu có code, và đưa ra kết luận có căn cứ. Nếu thiếu dữ kiện hoặc có nhiều cách hiểu, nói rõ 'CHƯA THỂ KẾT LUẬN'."
 };
 return `${header}\n\nYÊU CẦU: ${instructions[mode]}\nTrả lời bằng tiếng Việt. Kết luận AI chỉ để tham khảo, không phải đáp án chuẩn của hệ thống.`;
}
