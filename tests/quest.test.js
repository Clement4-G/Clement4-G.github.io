import { test, expect } from 'bun:test';
import { createQuest, piecePlaces } from '../src/gallery/quest.js';

test('six pièces à trouver, réparties dans les quatre salles', () => {
  const places = piecePlaces(4);
  expect(places).toHaveLength(6);
  expect(new Set(places.map(p => p.id)).size).toBe(6);
  expect(new Set(places.map(p => p.roomIndex)).size).toBe(4);
});
test('ramasser une pièce compte une seule fois', () => {
  const q = createQuest(['a', 'b']);
  expect(q.collect('a')).toBe(true); expect(q.collect('a')).toBe(false); expect(q.collect('zzz')).toBe(false);
  expect(q.count).toBe(1); expect(q.complete).toBe(false);
  q.collect('b'); expect(q.complete).toBe(true);
});
test('la progression se sauvegarde et se relit, même abîmée', () => {
  const q = createQuest(['a', 'b']); q.collect('b');
  const again = createQuest(['a', 'b'], q.serialize());
  expect(again.has('b')).toBe(true); expect(again.count).toBe(1);
  expect(createQuest(['a'], '{pas du json').count).toBe(0);
  expect(createQuest(['a'], '["inconnue"]').count).toBe(0);
});
