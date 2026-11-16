import { test, expect } from 'bun:test';
import { LOADER_MIN_MS, LOADER_TAIL_MS, loaderWait } from '../src/loader-timing.js';

test('à la première visite, l\'écran reste au moins le temps minimum, compté depuis l\'ouverture', () => {
  expect(loaderWait({ first: true, skipped: false, now: 1000 })).toBe(LOADER_MIN_MS - 1000);
  expect(LOADER_MIN_MS).toBeGreaterThanOrEqual(7000);
});
test('si le site a mis longtemps à se préparer, il reste encore un vrai temps de lecture', () => {
  expect(loaderWait({ first: true, skipped: false, now: 9000 })).toBe(LOADER_TAIL_MS);
  expect(LOADER_TAIL_MS).toBeGreaterThanOrEqual(2500);
});
test('aux visites suivantes, ou si le visiteur clique sur Entrer, aucune attente', () => {
  expect(loaderWait({ first: false, skipped: false, now: 500 })).toBe(0);
  expect(loaderWait({ first: true, skipped: true, now: 500 })).toBe(0);
});
