import { test, expect } from 'bun:test';
import content from '../content/site.json';
import { ART_IDS, createPainting } from '../src/paintings/index.js';
const fakeCanvas = () => { const calls = []; const ctx = new Proxy({}, { get: (_, k) => (...a) => { calls.push(k); return ctx; }, set: () => true });
  return { width: 400, height: 300, getContext: () => ctx, calls }; };

test('chaque tableau du contenu a un art existant', () => {
  for (const p of Object.values(content.paintings)) expect(ART_IDS).toContain(p.art);
});
test('huit arts', () => { expect(ART_IDS).toHaveLength(8); });
test('chaque art dessine quelque chose en version fixe', () => {
  for (const id of ART_IDS) { const c = fakeCanvas(); createPainting(id, c, { reducedMotion: true }).drawStill(); expect(c.calls.length).toBeGreaterThan(0); }
});
test('chaque art dessine à un instant quelconque sans planter', () => {
  for (const id of ART_IDS) { const c = fakeCanvas(); const p = createPainting(id, c, { reducedMotion: false });
    for (const t of [0.5, 3.7, 61.2]) p.drawAt(t); expect(c.calls.length).toBeGreaterThan(0); }
});
test('en mouvement réduit, start ne lance aucune boucle', () => {
  let frames = 0; globalThis.requestAnimationFrame = () => { frames++; return 1; }; globalThis.cancelAnimationFrame = () => {};
  createPainting('gears', fakeCanvas(), { reducedMotion: true }).start();
  expect(frames).toBe(0);
});
test('start lance une seule boucle, stop l\'arrête', () => {
  let frames = 0, cancelled = 0; globalThis.requestAnimationFrame = () => { frames++; return 7; }; globalThis.cancelAnimationFrame = () => { cancelled++; };
  const p = createPainting('gears', fakeCanvas(), { reducedMotion: false });
  p.start(); p.start(); expect(frames).toBe(1); p.stop(); expect(cancelled).toBe(1);
});
test('un art inconnu lève une erreur claire', () => {
  expect(() => createPainting('inconnu', fakeCanvas(), { reducedMotion: false })).toThrow('art inconnu');
});

import { WORK_IDS, overlayEnvelope } from '../src/paintings/works.js';
test('chaque tableau des salles détourne une œuvre connue, avec son cartel', () => {
  for (const room of content.rooms) for (const id of room.paintings) {
    const w = content.paintings[id].work; expect(w).toBeDefined(); expect(WORK_IDS).toContain(w.image);
    expect(w.w).toBeGreaterThan(0); expect(w.h).toBeGreaterThan(0); expect(w.artist).toBeTruthy(); expect(w.title.fr).toBeTruthy();
  }
});
test('avec son image, un tableau dessine l\'œuvre puis le détournement', () => {
  const c = fakeCanvas(); const p = createPainting('opwaves', c, { reducedMotion: false, work: 'great-wave', image: { width: 1024, height: 688 } });
  p.drawAt(9); expect(c.calls).toContain('drawImage'); expect(c.calls.indexOf('drawImage')).toBeLessThan(c.calls.lastIndexOf('stroke'));
});
test('sans image chargée, le tableau garde son dessin de secours', () => {
  const c = fakeCanvas(); createPainting('opwaves', c, { reducedMotion: true, work: 'great-wave' }).drawStill();
  expect(c.calls).not.toContain('drawImage'); expect(c.calls.length).toBeGreaterThan(0);
});
test('le détournement apparaît puis s\'efface : l\'œuvre reste reconnaissable', () => {
  expect(overlayEnvelope(1)).toBe(0); expect(overlayEnvelope(9)).toBe(1);
  expect(overlayEnvelope(6)).toBeGreaterThan(0); expect(overlayEnvelope(6)).toBeLessThan(1);
});

test('l\'image d\'une œuvre n\'est téléchargée qu\'au moment où le tableau sert', () => {
  let loads = 0; const before = globalThis.Image;
  globalThis.Image = class { set src(v) { loads++; } };
  globalThis.requestAnimationFrame = () => 1; globalThis.cancelAnimationFrame = () => {};
  try {
    const p = createPainting('opwaves', fakeCanvas(), { reducedMotion: false, work: 'venus' });
    p.drawStill(); expect(loads).toBe(0);
    p.start(); p.start(); p.load(); expect(loads).toBe(1);
  } finally { globalThis.Image = before; }
});

import { loadWorkImage } from '../src/paintings/works.js';
test('une œuvre qui n\'a pas pu se charger est redemandée plus tard', async () => {
  let attempts = 0; const before = globalThis.Image;
  globalThis.Image = class { set src(v) { attempts++; setTimeout(() => this.onerror?.(), 0); } };
  try {
    await expect(loadWorkImage('babel')).rejects.toThrow();
    await expect(loadWorkImage('babel')).rejects.toThrow();
    expect(attempts).toBe(2);
  } finally { globalThis.Image = before; }
});
