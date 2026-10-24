import {describe,it,expect} from 'vitest';
import {makeAiPrompt,AI_PROMPT_MODES} from './aiPrompt';
describe('Ba chế độ prompt hỏi AI',()=>{
 const input={questionId:'HW01-Q01',body:'Tính 2 ** 3 và a // b?',options:[{id:'A',text:'2 ** 3'},{id:'B',text:'a // b'},{id:'C',text:'khác'},{id:'D',text:'thiếu'}]};
 it('giữ nguyên đề bài, lựa chọn và ký hiệu Python',()=>{for(const {id} of AI_PROMPT_MODES){const s=makeAiPrompt(input,id);expect(s).toContain('2 ** 3');expect(s).toContain('a // b');expect(s).toContain('D. thiếu');expect(s).toContain('HW01-Q01')}});
 it('không tự xác nhận đáp án',()=>{for(const {id} of AI_PROMPT_MODES){const s=makeAiPrompt(input,id);expect(s).toContain('CHƯA THỂ KẾT LUẬN');expect(s).toContain('không phải đáp án chuẩn')}});
 it('phân biệt yêu cầu giữa ba chế độ',()=>{expect(new Set(AI_PROMPT_MODES.map(m=>makeAiPrompt(input,m.id))).size).toBe(3)});
});
