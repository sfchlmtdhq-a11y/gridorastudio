export type EditorHistory = { stack: string[]; i: number; lock: boolean };

export function recordSnapshot(history: EditorHistory, value: string) {
  if (history.lock || history.stack[history.i] === value) return false;
  history.stack = history.stack.slice(0, history.i + 1);
  history.stack.push(value);
  if (history.stack.length > 60) history.stack.shift();
  history.i = history.stack.length - 1;
  return true;
}