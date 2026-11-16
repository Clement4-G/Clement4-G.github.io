import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import content from '../content/site.json';
import { ROOM_DEPTH, ROOM_WIDTH, paintingPlace } from '../src/gallery/tour.js';
import { createQualityGovernor } from '../src/gallery/quality.js';

test('chaque tableau a sa place sur un mur de sa salle, sans chevaucher un voisin', () => {
  content.rooms.forEach((room, i) => {
    const places = room.paintings.map((_, j) => paintingPlace(i, j));
    for (const p of places) {
      expect(Math.abs(p.x)).toBeCloseTo(ROOM_WIDTH / 2 - 0.06);
      expect(p.z).toBeLessThan(-(i * ROOM_DEPTH)); expect(p.z).toBeGreaterThan(-((i + 1) * ROOM_DEPTH));
    }
    expect(new Set(places.map(p => `${p.side}:${p.z}`)).size).toBe(places.length);
  });
});
test('la qualité descend quand la machine peine et ne remonte pas', () => {
  const q = createQualityGovernor(); let level = 1.5;
  for (let i = 0; i < 130; i++) level = q.sample(16); expect(level).toBe(1.5);
  for (let i = 0; i < 60; i++) level = q.sample(50); expect(level).toBe(1);
  for (let i = 0; i < 60; i++) level = q.sample(50); expect(level).toBe(0.75);
  for (let i = 0; i < 300; i++) level = q.sample(10); expect(level).toBe(0.75);
});
test('le coffre affiché dans le musée n\'utilise pas les vrais noms de dossiers', () => {
  const src = readFileSync('src/gallery/props.js', 'utf8');
  for (const real of ["'wiki/'", "'  domaines/'", "'  moi/'"]) expect(src).not.toContain(real);
});
