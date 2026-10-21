import {describe,it,expect} from 'vitest';
import {makeAiPrompt} from './aiPrompt';
describe('Hai prompt hỏi AI',()=>{
  const input={questionId:'HW01-Q01',body:'Tính 2 ** 3 và a // b?',options:[{id:'A',text:'2 ** 3'},{id:'B',text:'a // b'},{id:'C',text:'khác'},{id:'D',text:'thiếu'}]};
  it('không đánh mất ký hiệu Python',()=>{for(const mode of ['quick','detailed'] as const){const s=makeAiPrompt(input,mode);expect(s).toContain('2 ** 3');expect(s).toContain('a // b');expect(s).toContain('D. thiếu');expect(s).toContain('HW01-Q01')}});
  it('cảnh báo về đề mơ hồ',()=>{expect(makeAiPrompt(input,'quick')).toContain('CHƯA THỂ KẾT LUẬN');expect(makeAiPrompt(input,'detailed')).toContain('CHƯA THỂ KẾT LUẬN')});
});
