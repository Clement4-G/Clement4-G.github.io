import { test, expect } from 'bun:test';
import { resolveReducedMotion } from '../src/motion.js';

test('sans choix du visiteur, le réglage du système décide', () => {
  expect(resolveReducedMotion({ prefersReduced: true, stored: null })).toBe(true);
  expect(resolveReducedMotion({ prefersReduced: false, stored: null })).toBe(false);
});
test('le choix du visiteur passe avant le réglage du système', () => {
  expect(resolveReducedMotion({ prefersReduced: true, stored: 'on' })).toBe(false);
  expect(resolveReducedMotion({ prefersReduced: false, stored: 'off' })).toBe(true);
  expect(resolveReducedMotion({ prefersReduced: true, stored: 'n\'importe quoi' })).toBe(true);
});
test('l\'adresse peut forcer les animations, avant tout autre réglage', () => {
  expect(resolveReducedMotion({ prefersReduced: true, stored: 'off', search: '?anim=1' })).toBe(false);
  expect(resolveReducedMotion({ prefersReduced: false, stored: 'on', search: '?salle=ia&anim=0' })).toBe(true);
  expect(resolveReducedMotion({ prefersReduced: true, stored: null, search: '?anim=oui' })).toBe(true);
});
