import { expect, it } from 'vitest';
import { recordSnapshot, type EditorHistory } from './editor-history';

it('preserves redo after an unchanged snapshot following undo', () => {
  const h: EditorHistory = {stack:['blank','text'],i:0,lock:false};
  expect(recordSnapshot(h,'blank')).toBe(false);
  expect(h.stack[h.i + 1]).toBe('text');
});
it('records a pending edit before undo, keeping it available for redo', () => {
  const h: EditorHistory = {stack:['blank'],i:0,lock:false};
  recordSnapshot(h,'text');
  h.i--;
  expect(h.stack[h.i]).toBe('blank');
  h.i++;
  expect(h.stack[h.i]).toBe('text');
});
it('groups multiple AI mutations in a single undoable snapshot', () => {
  const h: EditorHistory = {stack:['blank'],i:0,lock:true};
  recordSnapshot(h,'heading');
  recordSnapshot(h,'heading and shape');
  h.lock=false;
  recordSnapshot(h,'heading and shape');
  expect(h.stack).toEqual(['blank','heading and shape']);
});
it('discards an obsolete redo branch only when a new edit happens', () => {
  const h: EditorHistory = {stack:['blank','old'],i:0,lock:false};
  recordSnapshot(h,'new');
  expect(h.stack).toEqual(['blank','new']);
});