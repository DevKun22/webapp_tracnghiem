import {test,expect} from 'vitest';
import {clock,remainingSeconds,scoreLabel} from './utils';
test('format clock',()=>{expect(clock(50*60)).toBe('50:00');expect(clock(-1)).toBe('00:00')});
test('expired never negative',()=>expect(remainingSeconds('2020-01-01T00:00:00Z')).toBe(0));
test('score format',()=>expect(scoreLabel(7.5)).toBe('7.50'));
