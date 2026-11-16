import { test, expect } from 'bun:test';
import { seeded, nextCandle, clockAngles } from '../src/gallery/props.js';
import { buildWorld, moveWalker } from '../src/gallery/walk.js';

test('le hasard du décor est reproductible et borné', () => {
  const a = seeded(42), b = seeded(42);
  for (let i = 0; i < 50; i++) { const v = a(); expect(v).toBe(b()); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
});
test('chaque bougie part de la clôture précédente et reste dans l\'écran', () => {
  const r = seeded(1); let close = 0.5;
  for (let i = 0; i < 400; i++) { const c = nextCandle(close, r); expect(c.open).toBe(close);
    expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close)); expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
    expect(c.low).toBeGreaterThanOrEqual(0); expect(c.high).toBeLessThanOrEqual(1); close = c.close; }
});
test('les aiguilles donnent la bonne heure', () => {
  expect(clockAngles(0, 0, 0)).toEqual({ hour: 0, minute: 0, second: 0 });
  expect(clockAngles(3, 0, 0).hour).toBeCloseTo(Math.PI / 2); expect(clockAngles(15, 30, 0).minute).toBeCloseTo(Math.PI);
  expect(clockAngles(6, 30, 0).hour).toBeCloseTo(Math.PI * 13 / 12); expect(clockAngles(0, 0, 45).second).toBeCloseTo(Math.PI * 1.5);
});
test('aucune marche au hasard ne traverse une cloison hors de sa porte', () => {
  const world = buildWorld(4, { secretOpen: false }); const r = seeded(9);
  for (let run = 0; run < 40; run++) { let p = { x: (r() - 0.5) * 8, z: -2 - r() * 8 };
    for (let i = 0; i < 400; i++) { const q = moveWalker(p, (r() - 0.5) * 1.2, (r() - 0.5) * 1.2, world);
      for (const wall of world.partitions) { const crossed = (p.z - wall.z) * (q.z - wall.z) < 0;
        if (crossed) { expect(wall.locked).toBe(false); expect(Math.abs(q.x)).toBeLessThanOrEqual(world.doorHalf); } }
      expect(q.z).toBeGreaterThan(world.hallEnd); p = q; } }
});

import { chatProgress } from '../src/gallery/props.js';
test('la discussion se tape, puis la réponse arrive ligne par ligne', () => {
  const q = 'Bonjour ?', a = ['Un', 'Deux'];
  expect(chatProgress(q, a, 0)).toEqual({ question: '', lines: [], done: false });
  expect(chatProgress(q, a, 0.2).question).toBe('Bonj');
  const mid = chatProgress(q, a, q.length / 22 + 0.6); expect(mid.question).toBe(q); expect(mid.lines).toEqual(['Un']); expect(mid.done).toBe(false);
  expect(chatProgress(q, a, 60)).toEqual({ question: q, lines: a, done: true });
});
