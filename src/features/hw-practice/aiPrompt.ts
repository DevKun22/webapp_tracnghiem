export type AiPromptMode = 'quick' | 'detailed';
export type Choice = {id:string;text:string};
/** Prompt thống nhất, chỉ xuất dữ liệu câu gốc đang hiển thị. Không gửi dữ liệu tới API AI. */
export function makeAiPrompt(input:{questionId:string;body:string;options:Choice[];language?:string},mode:AiPromptMode):string {
  const choices=input.options.map(o=>`${o.id}. ${o.text}`).join('\n');
  const header=`Bạn là người giải trắc nghiệm ${input.language||'Python 3'}. Hãy dựa vào đúng ngữ nghĩa và cú pháp ngôn ngữ, không phỏng đoán.\nMã câu: ${input.questionId}\n\nCÂU HỎI:\n${input.body.trim()}\n\nPHƯƠNG ÁN:\n${choices}`;
  return mode==='quick'
    ? `${header}\n\nYÊU CẦU: Trả lời ngay dòng đầu 'ĐÁP ÁN: X' (X là A/B/C/D hoặc nhiều chữ cái nếu thực sự nhiều phương án đúng); sau đó giải thích ngắn tối đa 3 câu. Nếu thiếu dữ kiện, lỗi code hoặc nhiều cách hiểu, nói rõ 'CHƯA THỂ KẾT LUẬN'; tuyệt đối không đoán.`
    : `${header}\n\nYÊU CẦU: (1) Giải từng lựa chọn A/B/C/D, giải thích tại sao đúng/sai. (2) Phân tích code theo Python 3, chú ý indentation, phiên bản thư viện và điều kiện tiền đề; đề nghị đoạn code kiểm chứng nếu phù hợp. (3) Nêu rõ nếu đề thiếu dữ kiện, lỗi, hoặc có nhiều phương án hợp lệ. (4) Kết luận ở cuối 'ĐÁP ÁN: X' hoặc 'CHƯA THỂ KẾT LUẬN'. Viết tiếng Việt rõ ràng.`;
}
