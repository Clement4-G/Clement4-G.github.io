import { test, expect } from 'bun:test';
import { Chess } from 'chess.js';
import data from '../content/chess-puzzle.json';
import { fenToBoard, applyUci, createPuzzle } from '../src/chess/puzzle.js';
const play = (g, uci) => g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

test('la ligne est légale et finit par un mat', () => {
  const g = new Chess(data.fen); expect(g.turn()).toBe('w');
  for (const m of data.line) play(g, m);
  expect(g.isCheckmate()).toBe(true);
});
test('le coup clé est le seul qui force le mat en deux', () => {
  const g = new Chess(data.fen); const keys = [];
  for (const m1 of g.moves({ verbose: true })) {
    g.move(m1); const replies = g.moves({ verbose: true });
    const forced = replies.length > 0 && replies.every(r => { g.move(r);
      const mate = g.moves({ verbose: true }).some(m3 => { g.move(m3); const ok = g.isCheckmate(); g.undo(); return ok; });
      g.undo(); return mate; });
    g.undo(); if (forced) keys.push(m1.from + m1.to);
  }
  expect(keys).toEqual([data.line[0].slice(0, 4)]);
});
test('fenToBoard lit la position de départ', () => {
  const b = fenToBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  expect(b[0][0]).toBe('r'); expect(b[7][4]).toBe('K'); expect(b[4][4]).toBeNull();
});
test('applyUci déplace sans muter', () => {
  const b = fenToBoard('8/8/8/8/8/8/4P3/8 w - - 0 1'); const n = applyUci(b, 'e2e4');
  expect(n[4][4]).toBe('P'); expect(n[6][4]).toBeNull(); expect(b[6][4]).toBe('P');
});
test('déroulé : mauvais coup refusé, bonne ligne résolue, remise à zéro', () => {
  const p = createPuzzle(data);
  expect(p.tryMove('a1a2')).toEqual({ ok: false, solved: false });
  expect(p.tryMove(data.line[0])).toEqual({ ok: true, reply: data.line[1], solved: false });
  expect(p.tryMove(data.line[2])).toEqual({ ok: true, solved: true });
  p.reset(); expect(p.board()).toEqual(fenToBoard(data.fen));
});
test('après un mauvais coup la position ne change pas', () => {
  const p = createPuzzle(data); p.tryMove('a1a2');
  expect(p.board()).toEqual(fenToBoard(data.fen));
});
test('une fois résolu, plus aucun coup n\'est accepté', () => {
  const p = createPuzzle(data); p.tryMove(data.line[0]); p.tryMove(data.line[2]);
  expect(p.tryMove('a6a7')).toEqual({ ok: false, solved: true });
});
