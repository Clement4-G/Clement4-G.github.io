import { test, expect } from 'bun:test';
import { ROOM_DEPTH } from '../src/gallery/tour.js';
import { RADIUS, Z_START, buildWorld, moveWalker, roomIndexAt, facingPainting, doorOpening, driveStep, arcFor, patrolPoint, lookDelta, HALL_DEPTH } from '../src/gallery/walk.js';

const world = buildWorld(4, { secretOpen: false });

test('la marche avance librement au milieu d\'une salle', () => {
  expect(moveWalker({ x: 0, z: -3 }, 1, -1, world)).toEqual({ x: 1, z: -4 });
});
test('les murs latéraux arrêtent le visiteur', () => {
  const p = moveWalker({ x: 4, z: -3 }, 5, 0, world);
  expect(p.x).toBeCloseTo(5 - RADIUS); expect(p.z).toBe(-3);
});
test('une cloison arrête le visiteur hors de la porte, mais il glisse le long', () => {
  const p = moveWalker({ x: 3.5, z: -11 }, 0.5, -2, world);
  expect(p.z).toBe(-11); expect(p.x).toBe(4);
});
test('on traverse une cloison par la porte', () => {
  expect(moveWalker({ x: 0, z: -11.5 }, 0, -1, world).z).toBe(-12.5);
});
test('la salle secrète est fermée tant que la quête n\'est pas finie', () => {
  const end = -4 * ROOM_DEPTH;
  expect(moveWalker({ x: 0, z: end + 0.7 }, 0, -1, world).z).toBe(end + 0.7);
  const open = buildWorld(4, { secretOpen: true });
  expect(moveWalker({ x: 0, z: end + 0.7 }, 0, -1, open).z).toBeCloseTo(end - 0.3);
});
test('on ne sort jamais du bâtiment', () => {
  const open = buildWorld(4, { secretOpen: true });
  expect(moveWalker({ x: 0, z: Z_START - 0.6 }, 0, 3, open).z).toBeCloseTo(Z_START - RADIUS);
  expect(moveWalker({ x: 0, z: open.zEnd + 0.6 }, 0, -3, open).z).toBeCloseTo(open.zEnd + RADIUS);
});
test('la salle se déduit de la position', () => {
  expect(roomIndexAt(3, 4)).toBe(0); expect(roomIndexAt(-5, 4)).toBe(0);
  expect(roomIndexAt(-13, 4)).toBe(1); expect(roomIndexAt(-47, 4)).toBe(3); expect(roomIndexAt(-50, 4)).toBe(4);
});
test('le tableau regardé est celui qui est proche et en face', () => {
  const places = [{ id: 'a', x: -4.9, z: -4 }, { id: 'b', x: 4.9, z: -8 }];
  expect(facingPainting({ x: 0, z: -4 }, Math.PI / 2, places)).toBe('a');   // regard vers -X
  expect(facingPainting({ x: 0, z: -4 }, -Math.PI / 2, places)).toBeNull(); // regard vers +X, b trop de côté
  expect(facingPainting({ x: 0, z: -8 }, -Math.PI / 2, places)).toBe('b');
  expect(facingPainting({ x: 0, z: -30 }, Math.PI / 2, places)).toBeNull();
});
test('une porte s\'ouvre quand on approche', () => {
  expect(doorOpening(8)).toBe(0); expect(doorOpening(1)).toBe(1);
  expect(doorOpening(3.5)).toBeGreaterThan(0); expect(doorOpening(3.5)).toBeLessThan(1);
});

test('la visite commence dans le hall, sans couloir', () => { expect(Z_START).toBe(HALL_DEPTH); });
test('la voiture accélère, plafonne, freine et ne tourne qu\'en roulant', () => {
  let car = { speed: 0, yaw: 0 };
  expect(driveStep(car, { throttle: 0, steer: 1 }, 0.1).yaw).toBe(0);
  for (let i = 0; i < 100; i++) car = driveStep(car, { throttle: 1, steer: 0 }, 0.1);
  expect(car.speed).toBeCloseTo(9); expect(car.yaw).toBe(0);
  const turned = driveStep(car, { throttle: 1, steer: 1 }, 0.1); expect(turned.yaw).toBeGreaterThan(0);
  for (let i = 0; i < 100; i++) car = driveStep(car, { throttle: 0, steer: 0 }, 0.1);
  expect(car.speed).toBeCloseTo(0);
  for (let i = 0; i < 100; i++) car = driveStep(car, { throttle: -1, steer: 0 }, 0.1);
  expect(car.speed).toBeCloseTo(-3);
});
test('l\'intérieur d\'un tableau s\'enroule selon ses proportions, sans dépasser un demi-tour', () => {
  expect(arcFor(1)).toBeCloseTo(13 / 9); expect(arcFor(0.5)).toBeGreaterThanOrEqual(1); expect(arcFor(5)).toBe(Math.PI);
});
test('un agent en patrouille suit sa boucle et y revient', () => {
  const loop = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 3 }];   // périmètre 4 + 3 + 5 = 12
  expect(patrolPoint(loop, 0, 1)).toMatchObject({ x: 0, z: 0 });
  expect(patrolPoint(loop, 2, 1)).toMatchObject({ x: 2, z: 0 });
  const p = patrolPoint(loop, 5.5, 1); expect(p.x).toBeCloseTo(4); expect(p.z).toBeCloseTo(1.5);
  const back = patrolPoint(loop, 12, 1); expect(back.x).toBeCloseTo(0); expect(back.z).toBeCloseTo(0);
  expect(patrolPoint(loop, 2, 1).heading).toBeCloseTo(Math.atan2(4, 0));
});

import { GARDEN, zoneAt } from '../src/gallery/walk.js';
test('une porte dans le mur de la salle 2 mène au jardin, et nulle part ailleurs', () => {
  const w = buildWorld(4, { secretOpen: false });
  // face à la porte du jardin : on traverse le mur
  let p = { x: -4, z: GARDEN.doorZ };
  for (let i = 0; i < 12; i++) p = moveWalker(p, -0.4, 0, w);
  expect(p.x).toBeLessThan(-6); expect(zoneAt(p, 4)).toBe('garden');
  // ailleurs sur le même mur : on bute
  let q = { x: -4, z: GARDEN.doorZ + 3 };
  for (let i = 0; i < 12; i++) q = moveWalker(q, -0.4, 0, w);
  expect(q.x).toBeCloseTo(-5 + RADIUS); expect(zoneAt(q, 4)).toBe(1);
});
test('dans le jardin, on reste entre ses murs et on ne rentre que par la porte', () => {
  const w = buildWorld(4, { secretOpen: false }); const r = (() => { let s = 5; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  let p = { x: -10, z: -18 };
  for (let i = 0; i < 3000; i++) {
    const q = moveWalker(p, (r() - 0.5) * 1.1, (r() - 0.5) * 1.1, w);
    expect(q.x).toBeGreaterThanOrEqual(GARDEN.xMin + RADIUS - 1e-9); expect(q.x).toBeLessThanOrEqual(5 - RADIUS + 1e-9);
    if (q.x < GARDEN.xMax - RADIUS) { expect(q.z).toBeGreaterThanOrEqual(GARDEN.zMin + RADIUS - 1e-9); expect(q.z).toBeLessThanOrEqual(GARDEN.zMax - RADIUS + 1e-9); }
    // dans l'épaisseur du mur, on est forcément dans l'embrasure de la porte
    if (q.x < -5 + RADIUS - 1e-9 && q.x > GARDEN.xMax - RADIUS + 1e-9) expect(Math.abs(q.z - GARDEN.doorZ)).toBeLessThanOrEqual(GARDEN.doorHalf - RADIUS + 1e-9);
    p = q;
  }
});

import { avoidObstacles } from '../src/gallery/walk.js';
test('repoussé par un meuble contre le mur ouest, le visiteur reste dans sa salle', () => {
  const w = buildWorld(4, { secretOpen: false });
  // un bureau à 0,95 m du mur : la poussée ne doit ni sortir du bâtiment ni téléporter vers la porte du jardin
  const desk = [{ x: -3.6, z: -9.6, radius: 0.95 }];
  let p = { x: -4.5, z: -8.4 };
  for (let i = 0; i < 60; i++) { p = avoidObstacles(moveWalker(p, 0, -0.05, w), desk, w);
    expect(p.x).toBeGreaterThanOrEqual(-5 + RADIUS - 1e-9); expect(p.z).toBeGreaterThan(-12); expect(p.z).toBeLessThan(-8); }
  // même posé par erreur dans l'épaisseur du mur, loin de la porte, on est ramené dans la salle sans changer de profondeur
  const fixed = moveWalker({ x: -4.85, z: -8.5 }, 0, 0, w);
  expect(fixed.x).toBeCloseTo(-5 + RADIUS); expect(fixed.z).toBe(-8.5);
});
test('le hall est un lieu à part : on n\'y agit pas sur la salle 1', () => {
  expect(zoneAt({ x: 0, z: 2 }, 4)).toBe('hall'); expect(zoneAt({ x: 0, z: -2 }, 4)).toBe(0); expect(zoneAt({ x: 0, z: -50 }, 4)).toBe(4);
});
