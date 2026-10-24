import {describe,it,expect} from 'vitest';
import {normalizeTutorAnswer} from './aiAnswerFormat';
describe('Tutor answer normalization',()=>{
 it('renders JSON without trusting unsupported answer labels',()=>{const r=normalizeTutorAnswer('{"suggestedAnswer":"B","summary":"Đáp án B","explanation":"**Giải thích**","optionAnalysis":{"A":"Không đúng"},"caveat":"Cần kiểm chứng"}');expect(r.suggestedAnswer).toBe('B');expect(r.explanation).toBe('Giải thích');expect(r.optionAnalysis.A).toBe('Không đúng')});
 it('handles plain Markdown answer gracefully',()=>{const r=normalizeTutorAnswer('**Đáp án gợi ý:** B\n- Giải thích tuple');expect(r.explanation).toContain('Đáp án gợi ý: B');expect(r.suggestedAnswer).toBeNull()});
 it('does not trust arbitrary answer as a valid A-D letter',()=>{expect(normalizeTutorAnswer('{"suggestedAnswer":"ADMIN","summary":"X","explanation":"Y"}').suggestedAnswer).toBeNull()});
});
