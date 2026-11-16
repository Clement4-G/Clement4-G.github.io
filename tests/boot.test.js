import { test, expect } from 'bun:test';
import { chooseMode } from '../src/capabilities.js';
import { runInitChain } from '../src/boot.js';
import { createTransitionLock } from '../src/transition.js';
const ok = { webgl: true, width: 1440, coarsePointer: false, forcedFast: false };

test('musée seulement si tout est réuni', () => {
  expect(chooseMode(ok)).toBe('museum');
  expect(chooseMode({ ...ok, webgl: false })).toBe('fast');
  expect(chooseMode({ ...ok, width: 899 })).toBe('fast');
  expect(chooseMode({ ...ok, width: 900 })).toBe('museum');
  expect(chooseMode({ ...ok, coarsePointer: true })).toBe('fast');
  expect(chooseMode({ ...ok, forcedFast: true })).toBe('fast');
});
test('une étape qui plante ne bloque pas les suivantes', async () => {
  const ran = [];
  const r = await runInitChain([
    { name: 'a', critical: false, run: () => { throw new Error('x'); } },
    { name: 'b', critical: false, run: async () => { ran.push('b'); } },
    { name: 'c', critical: true, run: async () => { throw new Error('y'); } },
    { name: 'd', critical: false, run: () => { ran.push('d'); } },
  ]);
  expect(ran).toEqual(['b', 'd']); expect(r.failed).toEqual(['a', 'c']); expect(r.criticalFailed).toBe(true);
});
test('sans panne critique, criticalFailed est faux', async () => {
  const r = await runInitChain([{ name: 'a', critical: false, run: () => { throw new Error('x'); } }, { name: 'b', critical: true, run: () => {} }]);
  expect(r.criticalFailed).toBe(false); expect(r.failed).toEqual(['a']);
});
test('une seule transition à la fois', async () => {
  const lock = createTransitionLock(); let release; let calls = 0;
  const first = lock.run(() => new Promise(r => { calls++; release = r; }));
  expect(await lock.run(async () => { calls++; })).toBe(false);
  release(); expect(await first).toBe(true); expect(calls).toBe(1);
  expect(await lock.run(async () => { calls++; })).toBe(true);
});
test('le verrou se libère même si la transition plante', async () => {
  const lock = createTransitionLock();
  expect(await lock.run(async () => { throw new Error('boom'); })).toBe(false);
  expect(await lock.run(async () => {})).toBe(true);
});
