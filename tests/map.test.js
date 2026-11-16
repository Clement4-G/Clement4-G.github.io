import { test, expect } from 'bun:test';
import content from '../content/site.json';
import { GARDEN_BOX, ROOM_LAYOUT, ROOM_LINKS, clampView, gardenLines } from '../src/map/layout.js';
import { shouldPlaySequence } from '../src/map/sequence-state.js';

test('chaque salle a une place, dans le repère, sans chevauchement', () => {
  const ids = content.rooms.map(r => r.id); expect(Object.keys(ROOM_LAYOUT).sort()).toEqual([...ids].sort());
  const boxes = Object.values(ROOM_LAYOUT);
  for (const b of boxes) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.x + b.w).toBeLessThanOrEqual(1000); expect(b.y).toBeGreaterThanOrEqual(0); expect(b.y + b.h).toBeLessThanOrEqual(600); }
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j];
    expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true); }
});
test('les flèches relient des salles existantes', () => {
  for (const [a, b] of ROOM_LINKS) { expect(ROOM_LAYOUT[a]).toBeDefined(); expect(ROOM_LAYOUT[b]).toBeDefined(); }
  expect(ROOM_LINKS).toHaveLength(3);
});
test('le zoom et le déplacement sont bornés', () => {
  expect(clampView({ x: 0, y: 0, scale: 10 }).scale).toBe(2.5);
  expect(clampView({ x: 0, y: 0, scale: 0.1 }).scale).toBe(0.6);
  const v = clampView({ x: 99999, y: -99999, scale: 1 });
  expect(Math.abs(v.x)).toBeLessThanOrEqual(1000); expect(Math.abs(v.y)).toBeLessThanOrEqual(600);
});
test('la séquence se joue une fois par session', () => {
  const mem = {}; const s = { get: k => mem[k] ?? null, set: (k, v) => { mem[k] = v; } };
  expect(shouldPlaySequence(s)).toBe(true); expect(shouldPlaySequence(s)).toBe(false);
});
test('stockage indisponible : la séquence se joue à chaque fois', () => {
  const s = { get: () => null, set: () => {} };
  expect(shouldPlaySequence(s)).toBe(true); expect(shouldPlaySequence(s)).toBe(true);
});
test('le journal des agents est bilingue et assez long', () => {
  expect(content.agentsLog.length).toBeGreaterThanOrEqual(8);
  for (const e of content.agentsLog) { expect(e.text.fr).toBeTruthy(); expect(e.text.en).toBeTruthy(); }
});

import { assignCursors } from '../src/map/cursors.js';
test('chaque élément de la carte est posé par le curseur d\'un agent, à tour de rôle', () => {
  const plan = assignCursors(['a', 'b', 'c'], { rooms: 4, paintings: 8, links: 3 });
  expect(plan).toHaveLength(15);
  expect(plan.filter(p => p.kind === 'rooms').map(p => p.agent)).toEqual(['a', 'b', 'c', 'a']);
  expect(new Set(plan.map(p => p.agent)).size).toBe(3);
  expect(plan.filter(p => p.kind === 'links').map(p => p.index)).toEqual([0, 1, 2]);
  expect(assignCursors([], { rooms: 2, paintings: 0, links: 0 })).toEqual([]);
});

import { doorGaps } from '../src/map/layout.js';
test('les portes des salles s\'ouvrent là où passent les flèches', () => {
  expect(doorGaps('ia')).toEqual([{ x1: 440, y1: 134, x2: 440, y2: 186 }]);
  const trading = doorGaps('trading');
  expect(trading).toContainEqual({ x1: 560, y1: 134, x2: 560, y2: 186 });
  expect(trading).toContainEqual({ x1: 719, y1: 260, x2: 771, y2: 260 });
  expect(doorGaps('apropos')).toEqual([{ x1: 440, y1: 414, x2: 440, y2: 466 }]);
  expect(doorGaps('inconnue')).toEqual([]);
});

test('l\'étiquette du jardin tient dans son cadre, en français comme en anglais', () => {
  // 21 px de police serif : mesuré à ~0,4 em par caractère sur capture, on prend 0,45 ; marge de 18 px de chaque côté
  const maxChars = Math.floor((GARDEN_BOX.w - 36) / (21 * 0.45));
  for (const lang of ['fr', 'en']) {
    const lines = gardenLines(content.garden.number, content.garden.title[lang]);
    expect(lines.length).toBeGreaterThanOrEqual(1);
    for (const line of lines) expect([...line].length).toBeLessThanOrEqual(maxChars);
  }
});
