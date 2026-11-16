import { test, expect } from 'bun:test';
import { GARDEN, RADIUS, avoidObstacles, buildWorld, moveWalker } from '../src/gallery/walk.js';
import { GARDEN_OBSTACLES } from '../src/gallery/garden.js';
import { HALL_OBSTACLES } from '../src/gallery/props.js';

const world = buildWorld(4, { secretOpen: false });
const walk = (p, dx, dz, obstacles, steps) => { for (let i = 0; i < steps; i++) p = avoidObstacles(moveWalker(p, dx, dz, world), obstacles, world); return p; };

test('on ne rentre plus dans la cheminée ni dans la bibliothèque du salon', () => {
  const fire = walk({ x: 3, z: 3.25 }, 0.1, 0, HALL_OBSTACLES, 40); expect(fire.x).toBeLessThan(4.15);
  const shelf = walk({ x: 1.2, z: 4.5 }, 0, 0.1, HALL_OBSTACLES, 40); expect(shelf.z).toBeLessThan(5.95);
});
test('dans le jardin, le bassin se contourne mais le pont se traverse', () => {
  const across = walk({ x: -6.2, z: GARDEN.doorZ }, -0.1, 0, GARDEN_OBSTACLES, 90);
  expect(across.x).toBeLessThan(-13); expect(Math.abs(across.z - GARDEN.doorZ)).toBeLessThan(0.3);
  const wade = walk({ x: -10.4, z: GARDEN.doorZ + 2.8 }, 0, -0.1, GARDEN_OBSTACLES, 20);
  expect(wade.z).toBeGreaterThan(GARDEN.doorZ + 0.6);
});
test('aucune promenade au hasard ne finit dans un objet du jardin', () => {
  let s = 3; const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  let p = { x: -8, z: -17 };
  for (let i = 0; i < 4000; i++) {
    p = avoidObstacles(moveWalker(p, (r() - 0.5) * 0.6, (r() - 0.5) * 0.6, world), GARDEN_OBSTACLES, world);
    for (const o of GARDEN_OBSTACLES) expect(Math.hypot(p.x - o.x, p.z - o.z)).toBeGreaterThan(o.radius + 0.3 - 0.35);
    expect(p.x).toBeGreaterThanOrEqual(GARDEN.xMin + RADIUS - 1e-9);
  }
});
